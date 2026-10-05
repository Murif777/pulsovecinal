# PulsoVecinal — Despliegue resiliente en AWS

Documento de lo que quedó implementado en la cuenta `816131787962`, región `us-east-1`, el 5 de octubre de 2026.

La aplicación pública es:

http://pv-alb-788668916.us-east-1.elb.amazonaws.com/

Login del dashboard: usuario `analista`, contraseña `pulso2026`.

---

## 1. Qué se quería y qué quedó

El diagrama de la práctica pide dos zonas de disponibilidad, un balanceador público, un grupo de instancias de front, un grupo de instancias de back y una base de datos con réplica. El plan anterior (`aws.md`) dejaba tres EC2 sueltas y la base en un contenedor, sin escalado.

Lo que está corriendo ahora:

```
Internet
  └─ ALB público pv-alb :80          (us-east-1a y us-east-1b)
       └─ ASG pv-asg-front           min 1, max 6, política por peticiones
            └─ nginx (contenedor) :80
                 └─ /api  →  ALB interno pv-alb-int :8080
                                └─ ASG pv-asg-back   min 1, max 6, política por peticiones
                                     └─ FastAPI (contenedor) :8080
                                          └─ RDS PostgreSQL 16 Multi-AZ :5432
                                               Primary + Standby
```

Las instancias arrancan en `t3.micro` desde una AMI que ya trae Docker y las imágenes de la aplicación. Así una instancia nueva empieza a servir en cerca de un minuto, que es lo que se vio en la prueba de estrés.

---

## 2. Estado actual (verificado por CLI)

| Recurso | Nombre / valor | Detalle |
|---|---|---|
| VPC | `vpc-0a2aa5f5da2688afb` | `10.0.0.0/16`, la de la práctica, reutilizada |
| Internet Gateway | `igw-0225eedaa312c7cef` | ya existía |
| NAT Gateway | `nat-075c6c0f9fb44965c` | en `10.0.1.0/24`, estado available |
| ALB público | `pv-alb` | `pv-alb-788668916.us-east-1.elb.amazonaws.com` |
| ALB interno | `pv-alb-int` | `internal-pv-alb-int-477632092.us-east-1.elb.amazonaws.com` |
| Target group front | `pv-tg-front` | HTTP 80, health check `GET /` |
| Target group back | `pv-tg-back` | HTTP 8080, health check `GET /health` |
| ASG front | `pv-asg-front` | min **1**, max **6**, desired 1 |
| ASG back | `pv-asg-back` | min **1**, max **6**, desired 1 |
| Política front | `pv-front-req` | `ALBRequestCountPerTarget` = 20 |
| Política back | `pv-back-req` | `ALBRequestCountPerTarget` = 20 |
| RDS | `pv-postgres` | PostgreSQL 16.9, `db.t3.micro`, **Multi-AZ**, available |
| Endpoint RDS | `pv-postgres.cl6e9f7gqqoo.us-east-1.rds.amazonaws.com:5432` | base `pulsovecinal`, usuario `pulso` |
| AMI | `ami-0b9bb987c3cebbc06` | `pv-golden-20261005-094607` |
| Launch template front | `pv-lt-front` / `lt-03867000f72adcd1f` | |
| Launch template back | `pv-lt-back` / `lt-0e229af990f568197` | |

Comprobación funcional después de dejar un solo destino en cada capa: `GET /api/barrios` respondió **200**.

---

## 3. Red

Se reutilizó la VPC de la práctica. Había una ruta `0.0.0.0/0` en estado `blackhole` hacia un NAT ya borrado (`nat-09a198c922c813ebb`). Esa ruta se eliminó y se reemplazó por el NAT nuevo. Sin eso, las subnets privadas no salen a internet (no pueden hablar con SSM ni, si hiciera falta, bajar imágenes).

### 3.1 Subnets

| CIDR | AZ | Id | Uso |
|---|---|---|---|
| 10.0.0.0/24 | us-east-1a | `subnet-0fb755caf7a987615` | pública: ALB y front |
| 10.0.1.0/24 | us-east-1a | `subnet-01597d8ef830a9f31` | pública: NAT Gateway |
| 10.0.2.0/24 | us-east-1b | `subnet-0de4f4f7732c5cf35` | privada: back |
| 10.0.3.0/24 | us-east-1b | `subnet-01e5ade643eefb9b7` | privada: RDS |
| 10.0.4.0/24 | us-east-1b | `subnet-03eb504e9d983762b` | pública: ALB y front (segunda AZ) |
| 10.0.5.0/24 | us-east-1a | `subnet-006d7bddc614a21c9` | privada: back (segunda AZ) |
| 10.0.6.0/24 | us-east-1a | `subnet-0382a9fb86a25e24e` | privada: RDS (segunda AZ). **Esta se creó en este despliegue** |

`10.0.5.0/24` ya existía y también es privada en 1a, pero se usó para el back. RDS exige dos subnets en zonas distintas que no choquen con el uso de las instancias, así que la segunda subnet de base de datos es `10.0.6.0/24`.

### 3.2 Tablas de ruteo

| Tabla | Id | Ruta por defecto |
|---|---|---|
| Pública `my-practice-public` | `rtb-0c7b2d20dd5c7e7e5` | `0.0.0.0/0` → Internet Gateway |
| Privada `my-practica-tb-private` | `rtb-002eae0cd799cb540` | `0.0.0.0/0` → `nat-075c6c0f9fb44965c` |

La subnet `10.0.6.0/24` quedó asociada a la tabla privada (`rtbassoc-0b80eb95e7b1d8f8b`).

### 3.3 Security groups (cadena, no puertos abiertos al mundo)

| Grupo | Id | Quién puede entrar |
|---|---|---|
| `SG-ALB` | `sg-0eddca5665d7c319e` | 80 y 443 desde `0.0.0.0/0` |
| `SG-Front` | `sg-0d01cc04b0f9b1d1c` | 80 y 443 solo desde `SG-ALB` |
| `SG-ALB-Int` | `sg-03f53d27479a55540` | 8080 solo desde `SG-Front`. **Creado en este despliegue** |
| `SG-Back` | `sg-0145db8bf5b3ff040` | 8080 desde `SG-Front` y desde `SG-ALB-Int` |
| `SG-DB` | `sg-09c9014dd0bab5cea` | 5432 solo desde `SG-Back` |

El ALB interno es necesario porque el back es un grupo de varias instancias: nginx no puede apuntar a una IP fija. Apunta al DNS del ALB interno, y ese reparte entre las instancias que el grupo vaya creando.

`SG-ALB-Int` se creó así:

```powershell
aws ec2 create-security-group --region us-east-1 --group-name SG-ALB-Int `
  --description "Internal ALB: 8080 desde SG-Front" --vpc-id vpc-0a2aa5f5da2688afb
aws ec2 authorize-security-group-ingress --region us-east-1 `
  --group-id sg-03f53d27479a55540 --protocol tcp --port 8080 `
  --source-group sg-0d01cc04b0f9b1d1c
aws ec2 authorize-security-group-ingress --region us-east-1 `
  --group-id sg-0145db8bf5b3ff040 --protocol tcp --port 8080 `
  --source-group sg-03f53d27479a55540
```

---

## 4. Paso a paso de lo que se hizo

### Paso 1. Credenciales y CLI

AWS CLI v2 ya estaba instalado (`aws-cli/2.36.44`). Se configuró el perfil `[default]` con las credenciales temporales del Learner Lab y se comprobó la identidad:

```powershell
aws sts get-caller-identity
```

La cuenta respondió `816131787962` con el rol `voclabs`.

### Paso 2. Limpieza de lo viejo

Había tres EC2 de la práctica **encendidas** (el documento `aws.md` las daba por detenidas). Se terminaron:

- `Frontend_server` `i-0d80cfd7148e61d37`
- `backend_server` `i-053f7081fffc752e7`
- `Db-Server` `i-0ad69ad406955ea06`

No existían ALB, RDS, NAT ni Auto Scaling Groups. Solo quedaban el target group vacío `pv-tg-front` y los cuatro security groups del proyecto.

### Paso 3. Salida a internet de las subnets privadas

```powershell
aws ec2 delete-route --region us-east-1 --route-table-id rtb-002eae0cd799cb540 `
  --destination-cidr-block 0.0.0.0/0

aws ec2 allocate-address --region us-east-1 --domain vpc
# eipalloc-080e70f1bf9d8112e

aws ec2 create-nat-gateway --region us-east-1 `
  --subnet-id subnet-01597d8ef830a9f31 `
  --allocation-id eipalloc-080e70f1bf9d8112e
# nat-075c6c0f9fb44965c

aws ec2 create-route --region us-east-1 --route-table-id rtb-002eae0cd799cb540 `
  --destination-cidr-block 0.0.0.0/0 --nat-gateway-id nat-075c6c0f9fb44965c
```

Hay un solo NAT (en 1a), no uno por zona. Si cae 1a, las instancias privadas de 1b pierden salida a internet. El tráfico de la aplicación hacia RDS no depende del NAT: es tráfico interno de la VPC.

### Paso 4. Subnet extra para RDS Multi-AZ

```powershell
aws ec2 create-subnet --region us-east-1 --vpc-id vpc-0a2aa5f5da2688afb `
  --cidr-block 10.0.6.0/24 --availability-zone us-east-1a
# subnet-0382a9fb86a25e24e

aws ec2 associate-route-table --region us-east-1 `
  --route-table-id rtb-002eae0cd799cb540 --subnet-id subnet-0382a9fb86a25e24e

aws rds create-db-subnet-group --region us-east-1 `
  --db-subnet-group-name pv-db-subnet-group `
  --db-subnet-group-description "PulsoVecinal RDS Multi-AZ subnets (1a+1b)" `
  --subnet-ids subnet-01e5ade643eefb9b7 subnet-0382a9fb86a25e24e
```

### Paso 5. RDS PostgreSQL Multi-AZ

El diagrama genérico dice MySQL en el puerto 3306. Esta aplicación no funciona con MySQL: el esquema usa `CREATE EXTENSION postgis` y columnas `geometry(Point, 4326)`. Por eso la base es PostgreSQL 16.

```powershell
aws rds create-db-instance --region us-east-1 `
  --db-instance-identifier pv-postgres `
  --db-instance-class db.t3.micro `
  --engine postgres --engine-version 16.9 `
  --master-username pulso --master-user-password <generada> `
  --db-name pulsovecinal `
  --allocated-storage 20 --storage-type gp3 `
  --db-subnet-group-name pv-db-subnet-group `
  --vpc-security-group-ids sg-09c9014dd0bab5cea `
  --multi-az --no-publicly-accessible `
  --backup-retention-period 1
```

Tardó unos 15 minutos en pasar a `available` con `MultiAZ: true`. La contraseña y el `JWT_SECRET` están solo en `Contexto/deploy/aws-resilient/state.local.ps1`, que no se versiona.

RDS no ejecuta los scripts del contenedor. El esquema y los datos se cargaron desde la instancia auxiliar, con el cliente `postgres:16-alpine`, aplicando:

- `db/init/01-schema.sql` (extensión PostGIS, tablas, índices GIST, tipos enum)
- `db/init/02-seed.sql` (6 comunas, 15 barrios, 20 respuestas, usuario `analista`)

La carga sí se aplicó. El comando de conteo posterior falló solo por comillas que PowerShell se comió; los `INSERT` devolvieron `INSERT 0 6`, `INSERT 0 15`, `INSERT 0 20` e `INSERT 0 1`.

Para esa carga se abrió temporalmente el puerto 5432 desde el security group `default` hacia `SG-DB`, y se volvió a cerrar al terminar.

### Paso 6. AMI dorada

Se lanzó una instancia auxiliar `pv-bake` (`i-0e7eb9ced2238e4fb`) en la subnet pública, con el perfil `LabInstanceProfile` (ya existía en el laboratorio; esta cuenta no deja crear roles IAM). El user-data instaló Docker y descargó:

- `miguecaramirez/pulsovecinal:latest`
- `miguecaramirez/pulsovecinal-backend:latest`
- `postgres:16-alpine` (cliente usado para inicializar RDS)

Cuando el script escribió `/tmp/bake-done`, se creó la AMI **sin reiniciar** la instancia, para poder seguir usándola en la carga de RDS:

```powershell
aws ec2 create-image --region us-east-1 --instance-id i-0e7eb9ced2238e4fb `
  --name pv-golden-20261005-094607 --no-reboot
# ami-0b9bb987c3cebbc06
```

La instancia auxiliar se terminó después de crear la AMI.

### Paso 7. Balanceadores

El target group `pv-tg-front` ya existía. Se creó `pv-tg-back` en el puerto 8080 con health check `/health`.

```powershell
aws elbv2 create-load-balancer --region us-east-1 --name pv-alb `
  --subnets subnet-0fb755caf7a987615 subnet-03eb504e9d983762b `
  --security-groups sg-0eddca5665d7c319e `
  --scheme internet-facing --type application

aws elbv2 create-load-balancer --region us-east-1 --name pv-alb-int `
  --subnets subnet-006d7bddc614a21c9 subnet-0de4f4f7732c5cf35 `
  --security-groups sg-03f53d27479a55540 `
  --scheme internal --type application
```

Listeners:

- `pv-alb` puerto 80 → `pv-tg-front`
- `pv-alb-int` puerto 8080 → `pv-tg-back`

### Paso 8. Launch templates

El user-data de cada plantilla está en `Contexto/deploy/aws-resilient/userdata.generated/`.

**Back** (`pv-lt-back`): arranca Docker y el contenedor `pulsovecinal-backend` publicando `8080:8000`, con `DATABASE_URL` apuntando al endpoint de RDS, el `JWT_SECRET` y `CORS_ORIGINS` igual al DNS del ALB público.

**Front** (`pv-lt-front`): toma el `nginx.conf` del repositorio, cambia `http://backend:8000` por `http://internal-pv-alb-int-477632092.us-east-1.elb.amazonaws.com:8080` y arranca el contenedor `pulsovecinal` en el puerto 80.

Ambas plantillas usan la AMI dorada, `t3.micro` y el perfil `LabInstanceProfile`.

```powershell
aws ec2 create-launch-template --region us-east-1 `
  --launch-template-name pv-lt-back `
  --launch-template-data file://Contexto/deploy/aws-resilient/userdata.generated/lt-back.json

aws ec2 create-launch-template --region us-east-1 `
  --launch-template-name pv-lt-front `
  --launch-template-data file://Contexto/deploy/aws-resilient/userdata.generated/lt-front.json
```

El script que genera esos JSON es `Contexto/deploy/aws-resilient/build-lt.ps1`.

### Paso 9. Auto Scaling del front

```powershell
aws autoscaling create-auto-scaling-group --region us-east-1 `
  --auto-scaling-group-name pv-asg-front `
  --launch-template "LaunchTemplateId=lt-03867000f72adcd1f,Version=`$Latest" `
  --min-size 2 --max-size 6 --desired-capacity 2 `
  --vpc-zone-identifier "subnet-0fb755caf7a987615,subnet-03eb504e9d983762b" `
  --target-group-arns arn:aws:elasticloadbalancing:us-east-1:816131787962:targetgroup/pv-tg-front/7c32e701412dbe4d `
  --health-check-type ELB --health-check-grace-period 300
```

Después de la prueba de estrés se ajustó el piso a 1, que es el valor pedido:

```powershell
aws autoscaling update-auto-scaling-group --region us-east-1 `
  --auto-scaling-group-name pv-asg-front `
  --min-size 1 --max-size 6 --desired-capacity 1
```

Política de escalado (archivo `Contexto/deploy/aws-resilient/policy-front.json`):

```powershell
aws autoscaling put-scaling-policy --region us-east-1 `
  --auto-scaling-group-name pv-asg-front `
  --policy-name pv-front-req `
  --policy-type TargetTrackingScaling `
  --target-tracking-configuration file://Contexto/deploy/aws-resilient/policy-front.json
```

El objetivo es **20 peticiones por minuto por instancia** en el target group del ALB público. Si el promedio sube de eso, el grupo lanza instancias hasta 6. Si baja, las quita hasta dejar 1.

### Paso 10. Auto Scaling del back

#### 10.1 Primeros intentos: el CLI lo negó

Con `pv-asg-front` ya creado, estos dos comandos devolvieron `AccessDenied` (código 254):

```text
User: arn:aws:sts::816131787962:assumed-role/voclabs/user5431903=fmuriel@unicesar.edu.co
is not authorized to perform: autoscaling:CreateAutoScalingGroup
on resource: arn:aws:autoscaling:us-east-1:816131787962:autoScalingGroup:*:autoScalingGroupName/pv-asg-back
with an explicit deny in a service control policy:
arn:aws:organizations::634923989798:policy/o-mbimhftymp/service_control_policy/p-d2ahfolz
```

El mismo deny apareció al probar el nombre `pv-asg-api`. En ese momento solo existía `pv-asg-front`. Por eso el back se levantó primero como dos EC2 sueltas (una en cada zona), registradas a mano en `pv-tg-back`.

#### 10.2 Reintento pedido: el CLI sí lo dejó

Al volver a ejecutar el alta, el mismo tipo de comando **terminó con código 0** y el grupo apareció en `describe-auto-scaling-groups`. No hace falta crearlo desde la consola: ya existe. Crear otro con el mismo nombre va a fallar, y crear uno distinto duplicaría el back.

Comando que sí pasó:

```powershell
aws autoscaling create-auto-scaling-group --region us-east-1 `
  --auto-scaling-group-name pv-asg-back `
  --launch-template "LaunchTemplateId=lt-0e229af990f568197,Version=`$Latest" `
  --min-size 1 --max-size 6 --desired-capacity 1 `
  --vpc-zone-identifier "subnet-006d7bddc614a21c9,subnet-0de4f4f7732c5cf35" `
  --target-group-arns arn:aws:elasticloadbalancing:us-east-1:816131787962:targetgroup/pv-tg-back/d3878272fe78736b `
  --health-check-type ELB --health-check-grace-period 300 `
  --tags "Key=Name,Value=pv-asg-back,PropagateAtLaunch=true" "Key=Project,Value=pulsovecinal,PropagateAtLaunch=true"
```

Política, en `Contexto/deploy/aws-resilient/policy-back.json`:

```powershell
aws autoscaling put-scaling-policy --region us-east-1 `
  --auto-scaling-group-name pv-asg-back `
  --policy-name pv-back-req `
  --policy-type TargetTrackingScaling `
  --target-tracking-configuration file://Contexto/deploy/aws-resilient/policy-back.json
```

Misma regla que el front: 20 peticiones por minuto por instancia, sobre el target group del **ALB interno**, tope 6, piso 1.

La instancia del grupo (`i-07a0f8415242e5489`) pasó a `healthy`. Después se sacaron del target group y se terminaron las dos EC2 de back que se habían creado a mano (`i-06beca3268f08c3d1`, `i-054c54879e7c03d58`), para que el único back sea el Auto Scaling Group.

#### 10.3 Si la consola vuelve a hacer falta

Solo si el grupo `pv-asg-back` desaparece o el CLI vuelve a responder el deny de arriba. En la consola de EC2, región **US East (N. Virginia)**:

1. **Auto Scaling Groups → Create Auto Scaling group**.
2. Nombre: `pv-asg-back`. Launch template: `pv-lt-back`, versión Latest.
3. VPC `vpc-0a2aa5f5da2688afb`. Subnets: `10.0.5.0/24` (us-east-1a) y `10.0.2.0/24` (us-east-1b).
4. En balanceo, adjuntar al target group existente **`pv-tg-back`**. No crear otro balanceador.
5. Health check: **ELB**, periodo de gracia **300** segundos.
6. Capacidad: desired **1**, minimum **1**, maximum **6**.
7. Política de escalado: **Target tracking**, métrica **ALBRequestCountPerTarget**, target group `pv-tg-back`, valor **20**.
8. Crear el grupo.

Si la consola muestra el mismo `explicit deny` de la service control policy `p-d2ahfolz`, no es un error del formulario: la organización del laboratorio está bloqueando `autoscaling:CreateAutoScalingGroup`. En ese caso el back que sí puede quedar es el que ya exista; no hay un rodeo por CLI que evite esa política.

---

## 5. Prueba de estrés del front

Se generó carga durante unos 8 minutos contra:

`http://pv-alb-788668916.us-east-1.elb.amazonaws.com/api/barrios`

con 24 bucles paralelos de `Invoke-WebRequest`. El grupo estaba en mínimo 2 y máximo 6.

| Hora (UTC-5) | Desired | InService |
|---|---|---|
| 10:01 a 10:06 | 2 | 2 |
| 10:07:02 | 6 | 2 (acababa de decidir escalar) |
| 10:07:33 en adelante | 6 | 6 |

A las 10:07:04 UTC el grupo lanzó cuatro instancias nuevas:

- `i-02ee1727ce8073fee`
- `i-01dd0f1b3334eda23`
- `i-0b48769adb1bb4dec`
- `i-065e99d73d7b24850`

El target group las marcó **healthy** junto con las dos que ya servían (`i-06c13a73231b86130`, `i-0e42dfcc4e708a9a8`). El registro minuto a minuto está en `Contexto/deploy/aws-resilient/stress-log.txt`.

CloudWatch publica `ALBRequestCountPerTarget` por minuto, así que el salto no es instantáneo: aquí tardó unos cinco minutos de carga. Al bajar el desired a 1 después de la prueba, el grupo volvió a quedar en **1 instancia en servicio**.

El script de carga (`stress.ps1`) se quedó esperando los jobs al final y se cortó a mano. El código de salida 1 es ese corte, no un fallo del escalado.

---

## 6. Cómo se comprueba que sigue vivo

```powershell
# Identidad
aws sts get-caller-identity

# Capacidad de los dos grupos
aws autoscaling describe-auto-scaling-groups --region us-east-1 `
  --query "AutoScalingGroups[].{Name:AutoScalingGroupName,Min:MinSize,Max:MaxSize,Desired:DesiredCapacity}" `
  --output table

# La API a través del ALB público (front → ALB interno → back → RDS)
Invoke-WebRequest "http://pv-alb-788668916.us-east-1.elb.amazonaws.com/api/barrios" -UseBasicParsing

# Login
$body = '{"usuario":"analista","contrasena":"pulso2026"}'
Invoke-RestMethod "http://pv-alb-788668916.us-east-1.elb.amazonaws.com/api/auth/login" `
  -Method Post -ContentType "application/json" -Body $body
```

---

## 7. Archivos de este despliegue

En `Contexto/deploy/aws-resilient/`:

| Archivo | Para qué |
|---|---|
| `state.local.ps1` | IDs, contraseña de RDS y JWT. No versionar |
| `build-lt.ps1` | Regenera el user-data y los launch templates |
| `policy-front.json` / `policy-back.json` | Objetivo de 20 peticiones por instancia |
| `stress.ps1` / `stress-log.txt` | Carga y el salto de 2 a 6 |
| `bake.sh` | Receta de la AMI dorada |
| `userdata.generated/` | user-data ya rellenado. Contiene secretos. No versionar |

El plan anterior de tres EC2 sueltas sigue en `Contexto/deploy/aws/` y en `Downloads/aws.md`. No es el que está corriendo.

---

## 8. Replicar la arquitectura en la cuenta de un compañero

El script `Contexto/deploy/aws-resilient/desplegar.ps1` crea esta misma arquitectura en una cuenta vacía. No reutiliza los IDs de esta cuenta. Si en la cuenta ya existe `pv-alb` o `pv-postgres` fuera de una VPC llamada `pv-vpc`, se detiene y no borra nada.

Cada compañero, con el repositorio clonado y el AWS CLI instalado:

```powershell
aws configure
# Access Key, Secret y Session Token del laboratorio
# Region: us-east-1
# Output: json

powershell -ExecutionPolicy Bypass -File Contexto\deploy\aws-resilient\desplegar.ps1 -Confirmar
```

Tarda unos 30 a 40 minutos. Al final imprime la URL. El login es `analista` / `pulso2026`. Los dos grupos quedan en mínimo 1 y máximo 6, escalando al pasar de 20 peticiones por minuto por instancia.

Para borrar solo lo que el script creó (la VPC `pv-vpc`):

```powershell
powershell -ExecutionPolicy Bypass -File Contexto\deploy\aws-resilient\desplegar.ps1 -Accion Destruir -Confirmar
```

Ese borrado no toca el despliegue de esta cuenta, porque aquí la VPC no se llama `pv-vpc`.

## 9. Decisiones que conviene poder defender

1. **PostgreSQL + PostGIS, no MySQL.** El esquema del repositorio usa `geometry(Point, 4326)` e índice GIST. MySQL no ejecuta ese SQL.
2. **RDS Multi-AZ, no un contenedor.** El diagrama pide primary y standby. El contenedor de `pulsovecinal-db` sirvió de referencia para el esquema; en RDS el esquema se aplicó con `psql`.
3. **ALB interno delante del back.** Con varias instancias de API, el `proxy_pass` de nginx tiene que apuntar a un nombre que balancee, no a una IP.
4. **AMI con las imágenes ya descargadas.** Si cada instancia hiciera `docker pull` al nacer, el escalado de la prueba tardaría varios minutos más y el health check del ALB las marcaría unhealthy.
5. **t3.micro y un solo NAT.** El laboratorio tiene crédito limitado. El tamaño se puede subir en el launch template; el segundo NAT duplicaría el costo fijo del NAT (~32 USD/mes).
6. **Mínimo 1, máximo 6 en las dos capas.** Pedido explícito después de la prueba. El diagrama original decía front 2–6 y back 2–8; la capacidad que quedó configurada es 1–6 en ambos.
7. **El deny del segundo ASG fue real y luego dejó de serlo.** No se borró el grupo de front para “liberar un cupo”. El reintento directo de `create-auto-scaling-group` para `pv-asg-back` pasó.
