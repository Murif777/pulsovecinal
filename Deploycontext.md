# Encargo: desplegar PulsoVecinal en AWS

Eres el agente que va a desplegar la aplicación en la cuenta AWS de la persona que te pasó este archivo. No preguntes qué arquitectura armar. Ya está decidida. Busca el script en el repositorio, córrelo y quédate vigilándolo hasta que la URL responda.

No uses IDs, contraseñas ni credenciales de ninguna otra cuenta. Cada persona tiene su propio Learner Lab. Si `aws sts get-caller-identity` falla, pídele a esa persona sus credenciales temporales (access key, secret y session token), configúralas en el perfil `[default]` con región `us-east-1` y sigue. No las guardes en el repositorio ni las pegues en un archivo que se vaya a commitear.

## Qué es el sistema

PulsoVecinal es una SPA de encuestas ciudadanas georreferenciadas de Valledupar.

- Front: React/Vite servido por nginx. El navegador llama a la API con la ruta relativa `/api`. No hay CORS en producción porque nginx hace de proxy.
- Back: FastAPI. Dentro del contenedor escucha el puerto 8000. En el host se publica en **8080**.
- Datos: PostgreSQL 16 con PostGIS. El esquema usa `geometry(Point, 4326)` e índice GIST. MySQL no sirve: el mapa deja de funcionar.
- Imágenes ya publicadas en Docker Hub, no hay que compilar en la instancia:
  - `miguecaramirez/pulsovecinal:latest`
  - `miguecaramirez/pulsovecinal-backend:latest`
- Login de demostración: usuario `analista`, contraseña `pulso2026`.
- Repositorio: `https://github.com/Murif777/pulsovecinal.git`, rama `main`.

## Arquitectura del diagrama

El diagrama de la práctica muestra esto, y es el objetivo de resiliencia:

```
Internet / usuarios
  -> Internet Gateway
  -> ALB público en dos zonas (subnets públicas A y B)
       security group: 80 y 443 abiertos a internet
  -> Auto Scaling del front en las dos zonas
       security group: 80/443 solo desde el security group del ALB
  -> Auto Scaling del back en subnets privadas de aplicación, dos zonas
       el front le habla por el puerto 8080
       security group: 8080 solo desde el front
  -> RDS con primaria (writer) y standby (réplica) en subnets privadas de base de datos
       replicación síncrona, Multi-AZ
       security group: el puerto de la base solo desde el back
  NAT Gateway en subnet pública, para que lo privado pueda salir a internet
```

El diagrama pinta MySQL en el puerto 3306 y `db.t3.medium`, y además un NAT por zona, front de 2 a 6 y back de 2 a 8. Esas cuatro cosas no se copian tal cual. Lo que tiene que quedar corriendo es lo de la sección siguiente. No "corrijas" el script para volver a MySQL, a dos NAT o a un mínimo de 2.

## Lo que tiene que quedar corriendo

Región `us-east-1`. Todo con nombres `pv-*`, dentro de una VPC nueva etiquetada `pv-vpc` (`10.0.0.0/16`). No reutilices la VPC de una práctica anterior.

| Capa | Recurso | Detalle |
|---|---|---|
| Red | VPC, Internet Gateway, 1 NAT | Subnets públicas `10.0.0.0/24` y `10.0.4.0/24`. Subnet del NAT `10.0.1.0/24`. App privada `10.0.5.0/24` y `10.0.2.0/24`. Base de datos `10.0.6.0/24` y `10.0.3.0/24`. Dos zonas. Un solo NAT, a propósito, por el crédito del laboratorio. |
| Entrada | ALB público `pv-alb` | Puerto 80 hacia el target group del front. Health check `GET /`. |
| Front | ASG `pv-asg-front` | Mínimo **1**, máximo **6**. `t3.micro`. Launch template `pv-lt-front`. nginx en el puerto 80. |
| Entre capas | ALB interno `pv-alb-int` | El diagrama no lo dibuja. Hace falta porque el back es un grupo de instancias y nginx no puede apuntar a una IP fija. Escucha 8080 y reparte al target group del back. |
| Back | ASG `pv-asg-back` | Mínimo **1**, máximo **6**. `t3.micro`. Launch template `pv-lt-back`. FastAPI publicado en 8080. Health check `GET /health`. |
| Datos | RDS `pv-postgres` | PostgreSQL 16, `db.t3.micro`, **Multi-AZ**, sin IP pública, base `pulsovecinal`, usuario `pulso`. El esquema y el seed (`db/init/01-schema.sql` y `02-seed.sql`) los aplica la primera instancia de back. |
| Escalado | Target tracking | En los dos grupos, métrica `ALBRequestCountPerTarget`, objetivo **20** peticiones por minuto por instancia. Si sube la carga, el grupo lanza instancias hasta 6. Si baja, vuelve hacia 1. |
| AMI | `pv-golden-*` | Amazon Linux 2023 con Docker y las tres imágenes ya descargadas (`pulsovecinal`, `pulsovecinal-backend`, `postgres:16-alpine`). Así una instancia nueva sirve en cerca de un minuto. |

Cadena de security groups, sin 8080 ni 5432 abiertos a internet:

- `pv-sg-alb`: 80 y 443 desde `0.0.0.0/0`
- `pv-sg-front`: 80 desde `pv-sg-alb`
- `pv-sg-alb-int`: 8080 desde `pv-sg-front`
- `pv-sg-back`: 8080 desde `pv-sg-alb-int`
- `pv-sg-db`: 5432 desde `pv-sg-back`

El front hace proxy de `/api` al DNS del ALB interno, puerto 8080. El back usa `DATABASE_URL` contra el endpoint de RDS.

## Dónde está el script

Archivo exacto, relativo a la raíz del repositorio:

`Contexto/deploy/aws-resilient/desplegar.ps1`

Ese script es idempotente: si se corta, se vuelve a lanzar y retoma lo que ya existe. También sabe destruir solo la VPC `pv-vpc`. No ejecutes los scripts viejos de `Contexto/deploy/aws/` (el `01-network.ps1`, `05-ec2.ps1` y el resto). Ese plan era de tres EC2 sueltas, sin autoescalado, y no es el que se quiere.

Hay una bitácora del despliegue de referencia en `Contexto/Despliegue_AWS_Resiliente.md`. Léela si necesitas el porqué de una decisión. Los IDs de esa bitácora (VPC, ALB, instancias, endpoint de RDS) son de **otra cuenta**. No los copies. No intentes administrarlos.

Si el workspace no es este repositorio, o el script no está:

```powershell
git clone https://github.com/Murif777/pulsovecinal.git
cd pulsovecinal
```

Trabaja dentro de esa carpeta.

## Qué hacer, en orden

1. Confirma que existen `nginx.conf`, `db/init/01-schema.sql` y `db/init/02-seed.sql`. El script los necesita. Si faltan, no estás en el repositorio.
2. Instala AWS CLI v2 si `aws --version` falla.
3. Configura el perfil `default` con las credenciales **de esta persona** y región `us-east-1`. Comprueba con `aws sts get-caller-identity`.
4. Desde la raíz del repositorio, lanza el despliegue y no lo abandones:

```powershell
powershell -ExecutionPolicy Bypass -File Contexto\deploy\aws-resilient\desplegar.ps1 -Confirmar
```

5. Vigílalo. Tarda entre 30 y 40 minutos. El orden que va a seguir es: red y NAT, security groups, RDS Multi-AZ (lo más lento), los dos balanceadores, una instancia auxiliar que hornea la AMI, launch templates, los dos Auto Scaling Groups y las políticas de peticiones. Al final imprime la URL.
6. Si el token del laboratorio se vence a mitad de camino, pide uno nuevo, reconfigura el perfil y vuelve a lanzar **el mismo comando**. No borres lo ya creado para "empezar limpio".
7. Si crear `pv-asg-back` responde `AccessDenied` con `explicit deny` de una service control policy, reinténtalo una vez. Si sigue negado, créalo en la consola web de EC2, región US East (N. Virginia), sin inventar otro diseño:
   - Nombre `pv-asg-back`, launch template `pv-lt-back`, versión Latest.
   - Subnets `10.0.5.0/24` y `10.0.2.0/24` de la VPC `pv-vpc`.
   - Adjúntalo al target group que ya existe, `pv-tg-back`. No crees otro balanceador.
   - Health check ELB, gracia 300 segundos.
   - Capacidad: desired 1, minimum 1, maximum 6.
   - Política target tracking, métrica `ALBRequestCountPerTarget` del target group `pv-tg-back`, valor 20.
   El script ya dejó el texto de este caso. El front sí debe haber quedado como Auto Scaling Group.

## Cómo sabes que terminó bien

Sustituye el DNS por el que imprimió el script.

```powershell
aws autoscaling describe-auto-scaling-groups --region us-east-1 --query "AutoScalingGroups[?starts_with(AutoScalingGroupName, 'pv-asg-')].{Name:AutoScalingGroupName,Min:MinSize,Max:MaxSize,Desired:DesiredCapacity}" --output table

Invoke-WebRequest "http://<DNS-DEL-ALB>/api/barrios" -UseBasicParsing
```

Tiene que cumplirse todo esto:

- Los dos grupos existen, mínimo 1 y máximo 6.
- `GET /api/barrios` responde 200 y devuelve los barrios (el seed carga 15).
- El login funciona. El cuerpo es exactamente `{"usuario":"analista","contrasena":"pulso2026"}` contra `POST /api/auth/login`. El campo es `contrasena` con una sola r. La respuesta trae un token.
- RDS `pv-postgres` está `available` y `MultiAZ` es true.
- Hay un ALB de cara a internet (`pv-alb`) y otro interno (`pv-alb-int`).

Cuando eso esté verde, dile a la persona la URL y el usuario de prueba.

## Prueba de que escala por peticiones

Hazla solo después de que `/api/barrios` ya responda 200. No uses `Contexto/deploy/aws-resilient/stress.ps1`: ese archivo, si aparece en una copia local, apunta al balanceador de otra cuenta.

Lanza unos 20 bucles en paralelo contra `http://<DNS-DEL-ALB>/api/barrios` durante unos 8 minutos. Cada minuto consulta la capacidad de `pv-asg-front` y de `pv-asg-back`. La métrica de CloudWatch tarda unos minutos: el salto no es instantáneo. Lo esperado es que `Desired` suba por encima de 1 y no pase de 6.

Cuando lo hayas visto, corta la carga y devuelve la capacidad deseada a 1 para no gastar el crédito del laboratorio:

```powershell
aws autoscaling set-desired-capacity --region us-east-1 --auto-scaling-group-name pv-asg-front --desired-capacity 1 --no-honor-cooldown
aws autoscaling set-desired-capacity --region us-east-1 --auto-scaling-group-name pv-asg-back --desired-capacity 1 --no-honor-cooldown
```

No ejecutes el borrado total salvo que la persona te lo pida. Si lo pide, y solo entonces:

```powershell
powershell -ExecutionPolicy Bypass -File Contexto\deploy\aws-resilient\desplegar.ps1 -Accion Destruir -Confirmar
```

Eso borra únicamente la VPC etiquetada `pv-vpc` y lo que está dentro de ella.

## Qué no debes hacer

- No abras el puerto 22, 3306, 5432 ni 8080 a `0.0.0.0/0`.
- No cambies la base a MySQL ni a un contenedor suelto.
- No crees una segunda VPC ni otros nombres si el script se interrumpió: relánzalo.
- No commitees `stack.local.ps1`, `creds.local.ps1`, `state.local.ps1`, `userdata.generated/` ni archivos `.pem`. Ahí quedan la contraseña de RDS y el JWT.
- No des por terminado el trabajo cuando el script arranca. Termina cuando la URL responde 200 y los dos grupos están en mínimo 1 y máximo 6.
