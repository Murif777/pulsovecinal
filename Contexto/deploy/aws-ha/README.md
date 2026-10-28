# PulsoVecinal - despliegue de alta disponibilidad

Carpeta reproducible del stack HA de PulsoVecinal en AWS. Reproduce, de forma
**agnostica de cuenta y de region**, la arquitectura de dos zonas de
disponibilidad, tres niveles de subred y cadena de grupos de seguridad del
despliegue.

Nada aqui contiene numeros de cuenta, ARN, DNS ni identificadores de AMI: todo
se descubre en tiempo de ejecucion con llamadas `describe`. Los secretos se
generan al desplegar y quedan en `state.local.ps1`, que esta en `.gitignore`.

---

## Notas de capacidad del backend

- El contenedor arranca uvicorn con **dos workers** (`--workers 2`) para usar los dos vCPU de la instancia.
- `GET /api/encuestas` acepta `limit` (1-2000, por defecto 500) y `offset`; el listado ya no devuelve la tabla completa.
- Con el pico de diseno documentado (419 peticiones/minuto a la API) la CPU medida por instancia se mantiene por debajo del 1 %.

## 1. Topologia

```
                              Internet
                                 |
                     [SG-ALB]  80 / 443  <- 0.0.0.0/0
                                 |
                 +---------------+---------------+
                 |        pv-alb (internet-facing)|
                 |  public-a 10.0.0.0/24 (1a)    |
                 |  public-b 10.0.4.0/24 (1b)    |
                 +---------------+---------------+
                                 |  listener :80 -> pv-tg-back (/health :8080)
                     [SG-Back]  8080
                                 |
              +------------------+------------------+
              |                                     |
        pv-asg-back (min 2 / desired 2 / max 6)  pv-asg-back
        app-a 10.0.5.0/24  us-east-1a            app-b 10.0.2.0/24  us-east-1b
              |                                     |
              +------------------+------------------+
                                 |  5432   [SG-DB]
                       pv-postgres  Multi-AZ  (PostgreSQL 16)
                       db-a 10.0.6.0/24 (1a, primaria)
                       db-b 10.0.3.0/24 (1b, standby)

  salida a Internet de las subredes privadas:
        pv-nat  (UN solo NAT Gateway en 10.0.1.0/24, us-east-1a) + EIP

  presentacion:
        S3  pv-front-<cuenta>  (sitio estatico, index+error index.html)
        el navegador llama al ALB directamente, con CORS

  plan de reversion (dormido, no consume capacidad):
        pv-asg-front  min 0 / desired 0 / max 6
        procesos Launch y ReplaceUnhealthy SUSPENDIDOS
```

### Plan de direccionamiento (VPC 10.0.0.0/16)

| Subred | CIDR | Zona | Funcion |
|---|---|---|---|
| public-a | 10.0.0.0/24 | us-east-1a | balanceador publico |
| public-nat | 10.0.1.0/24 | us-east-1a | NAT Gateway |
| public-b | 10.0.4.0/24 | us-east-1b | balanceador publico |
| app-a | 10.0.5.0/24 | us-east-1a | backend |
| app-b | 10.0.2.0/24 | us-east-1b | backend |
| db-a | 10.0.6.0/24 | us-east-1a | RDS primaria |
| db-b | 10.0.3.0/24 | us-east-1b | RDS standby |

La distincion publico/privado no la da el nombre sino la ruta por defecto: la
tabla publica apunta al IGW y la privada al NAT.

---

## 2. Cadena de grupos de seguridad

Regla de diseno: **encadenamiento por referencia**. Las reglas apuntan al
identificador del grupo de la capa anterior, nunca a un rango de direcciones
(salvo la puerta de entrada). Asi siguen siendo validas cuando el escalado crea
o destruye instancias.

| Origen | Destino | Puerto | Motivo |
|---|---|---|---|
| 0.0.0.0/0 | SG-ALB | 80, 443 | unica entrada desde Internet |
| SG-ALB | SG-Front | 80 | solo si se enciende el plan de reversion |
| SG-ALB | SG-Back | 8080 | recorrido real: el ALB entrega directo al backend |
| SG-Back | SG-DB | 5432 | la base solo acepta conexiones de la API |
| SG-Bake | (sin ingreso) | - | instancia auxiliar de horneado |

No existe puerto 22 en ninguna regla: la administracion va por SSM Session
Manager con `LabInstanceProfile`.

---

## 3. Escalado

Dos politicas de seguimiento de objetivo sobre `pv-asg-back`. Ambas conviven: la
primera en reaccionar gana, y eso es deliberado (una protege latencia, la otra
protege saturacion de CPU).

| Politica | Metrica | Objetivo | Efecto observable |
|---|---|---|---|
| `pv-back-req` | ALBRequestCountPerTarget | 1.000 peticiones/destino | escala solo ante demanda real; no oscila con diez usuarios |
| `pv-back-cpu` | ASGAverageCPUUtilization | 65 % | escala en y reduce al bajar la CPU |

`ResourceLabel` **se resuelve en tiempo de ejecucion**
(`06-asg-policies.ps1`): se leen el ARN del ALB y del target group reales, se
arma `app/<alb>/<id>/targetgroup/<tg>/<id>` y se verifica leyendo la politica
recien escrita. La etiqueta se contrasta contra el ARN vigente y el script falla
si no coincide, de modo que una etiqueta desactualizada no puede pasar
inadvertida.

El valor por defecto es **1.000 peticiones por minuto por destino**, que es el
umbral de operacion: con el pico de diseno (419 peticiones/minuto a la API) dos
instancias absorben la demanda sin escalar, y el grupo solo crece cuando la
demanda real lo exige. Ese valor es una **hipotesis de produccion pendiente de
validar con prueba de carga**; para demostrar el escalado en minutos se puede
ejecutar el script con `-RequestsPerTarget 10`.

---

## 4. Base de datos

- PostgreSQL 16 en RDS, clase `db.t3.micro`, gp3 20 GB, retencion de respaldo 1 dia.
- **Multi-AZ**: primaria en `db-a` (us-east-1a), standby sincrona en `db-b` (us-east-1b). La conmutacion la hace RDS; el endpoint no cambia.
- No es publicamente accesible; solo acepta 5432 desde SG-Back.
- Migracion: `db/init/01-schema.sql` (PostGIS, comunas, barrios, respuestas, usuarios) y `db/init/02-seed.sql` (6 comunas, 15 barrios, 20 respuestas, 1 analista).
- **Siembra idempotente** desde el user-data del backend: antes de aplicar comprueba `SELECT 1 FROM comunas LIMIT 1`; si ya hay datos no hace nada. Por eso escalar a seis instancias no duplica datos.
- `03-rds.ps1 -Seed` permite forzar la migracion por SSM una vez existe una instancia del backend.

---

## 5. Presentacion

- El SPA se sirve desde **S3 como sitio estatico** (`index.html` como indice y como documento de error, para que las rutas profundas de React Router funcionen). CloudFront esta denegado en el laboratorio.
- El bucket se cifra con AES256 y usa una politica de lectura publica de objetos; el bloqueo de ACL publicas queda activo.
- El build se hace con `VITE_API_BASE` igual al origen del ALB (`07-s3-site.ps1`), de modo que el navegador llama `http://<alb>/api/...`.
- `CORS_ORIGINS` del backend incluye el origen del sitio y el del ALB.

---

## 6. Costo

Piso fijo del diseno: **115,964 USD/mes**. Se mantiene la decision de un solo
NAT Gateway (32,850 USD/mes) porque el trafico de la aplicacion hacia RDS es
interno a la VPC y no pasa por el NAT: si cae la zona A se pierde la salida a
Internet de la zona B (administracion y actualizaciones), no la atencion de
solicitudes.

Componentes que se pagan con el stack encendido: NAT (1), RDS Multi-AZ
`db.t3.micro`, ALB publico y las dos instancias minimas del backend. El ASG de
presentacion esta en 0 y no cuesta. Presupuesto de referencia: 130 USD/mes con
alertas al 50, 75 y 100 %.

---

## 7. Prerrequisitos

1. AWS CLI v2 y un perfil con permisos de laboratorio (`-Profile`).
2. `LabInstanceProfile` existente (el laboratorio no permite crear roles).
3. Node.js 22+ y npm para compilar el SPA.
4. Salida a Internet desde las subredes privadas (la da el NAT de `01-network.ps1`) para que las instancias alcancen Docker Hub y SSM.
5. Repositorio completo: el despliegue lee `db/init/*.sql` y compila desde la raiz.

---

## 8. Orden de construccion

```
01-network.ps1        -> VPC, IGW, 2 tablas de rutas, 7 subredes, NAT + EIP
02-security-groups.ps1-> SG-ALB, SG-Front, SG-Back, SG-DB, SG-Bake
03-rds.ps1            -> secretos nuevos + grupo de subredes + RDS Multi-AZ (10-20 min)
04-alb-tg.ps1         -> target group /health:8080 + ALB + listener :80
05-launch-templates.ps1 -> AMI dorada (horneada y probada) + 2 plantillas + 2 ASG
06-asg-policies.ps1   -> las dos politicas con ResourceLabel resuelto
07-s3-site.ps1        -> build del SPA + bucket + sitio + verificacion 200
08-tags-budgets.ps1   -> etiquetas por capa + presupuesto + alarma
09-verify.ps1         -> verificacion funcional de punta a punta
```

Ejemplo:

```powershell
cd Contexto\deploy\aws-ha
.\01-network.ps1 -Profile <tu-perfil-lab> -Region us-east-1
.\02-security-groups.ps1 -Profile <tu-perfil-lab>
...
.\09-verify.ps1 -Profile <tu-perfil-lab>
```

Todos son **idempotentes**: descubren por nombre y etiqueta, imprimen `[skip]`
en lo que ya existe y solo crean lo que falta. Se pueden volver a correr.

---

## 9. Verificacion

`09-verify.ps1` comprueba, sin crear infraestructura:

1. al menos 2 destinos `healthy` en `pv-tg-back`;
2. `GET /api/barrios` devuelve 15 barrios;
3. `POST /api/auth/login` con el usuario demo entrega token y `/api/auth/me` responde;
4. una llamada sin token devuelve **401**;
5. el preflight CORS devuelve `Access-Control-Allow-Origin` igual al origen exacto del sitio;
6. se escribe una encuesta y se relee (marca unica);
7. el sitio responde 200.

Conteos esperados en la base: `6 comunas / 15 barrios / 20 respuestas / 1 usuario`.

---

## 10. Teardown (orden inverso)

`10-teardown.ps1 -Profile <perfil> -Confirmar`:

1. ASG back y front (se reanudan los procesos suspendidos y se fuerza el borrado);
2. plantillas de lanzamiento;
3. ALB y despues target group;
4. instancias;
5. RDS y grupo de subredes;
6. NAT Gateway y liberacion de la EIP;
7. AMI doradas y sus snapshots;
8. grupos de seguridad (con reintentos por dependencias);
9. subredes, tablas de rutas no principales, IGW y VPC;
10. bucket (vaciado y borrado), presupuesto y alarma.

El script aborta si la VPC del stack fuese la VPC por defecto.

---

## 11. Decisiones y deudas

Decisiones:

- **Sin balanceador interno.** El ALB publico entrega directo al target group del backend, de modo que un balanceador intermedio no aporta ruta y si suma 16,43 USD/mes, un eslabon y un punto de fallo. La capa de presentacion por instancias queda solo como plan de reversion.
- **Un solo NAT Gateway** (ver costo).
- **S3 en vez de CloudFront** para el SPA: CloudFront esta denegado en el laboratorio.
- **Dos politicas de escalado** en lugar de una: peticiones por destino y CPU.
- **AMI capturada con la instancia detenida.** Capturarla encendida (`--no-reboot`) produjo capas de 0 bytes y contenedores que morian con `exec format error`; el horneado ademas prueba funcionalmente cada imagen antes de publicar la AMI.

Deudas declaradas:

- El perfil `LabInstanceProfile` no es de minimo privilegio por capa (lo impone el laboratorio).
- El umbral de escalado (1.000 peticiones/destino) es una hipotesis de operacion sin prueba de carga que la respalde.
- RDS sin cifrado en reposo (la retencion ya esta en 7 dias y la proteccion de borrado activa).
- Un unico NAT: la zona B pierde salida a Internet si cae la zona A.
- No hay alarmas de aplicacion, solo una de destinos no sanos en el ALB.

