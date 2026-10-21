# Git y GitHub: qué subir y cómo hacerlo

## Estado de este proyecto

El repositorio existente es `PTY4614_800D_Fut.ai/`, **no `MVP/`**. Durante esta preparación la rama activa es `Hector`, sigue a `origin/Hector` y ya existe el remoto `origin`. El código de `MVP/` todavía no estaba versionado. Las evidencias académicas de `Fase 1/` ya forman parte del historial y se conservan.

Se prepararon archivos y reglas; no se hizo `git add`, commit ni push. No hace falta inicializar otro repositorio dentro de `MVP/` ni cambiar el remoto existente.

## Qué incluir

| Incluir en Git | Mantener local o distribuir por separado |
|---|---|
| Backend: `.py`, tests y `requirements*.txt` | `.venv/`, `.venv-vision/`, cachés y logs |
| Frontend: `src/`, `public/`, configuración Vite/Tailwind | `node_modules/`, `dist/`, builds |
| `package.json` **y `package-lock.json`** | Paquetes instalados y copias comprimidas ZIP/RAR |
| `.env.example` de API y frontend | `.env` real, credenciales y certificados privados |
| Scripts BAT y configuración versionable | SQLite, entradas de trabajos y resultados de usuarios |
| Notebooks y scripts de investigación revisados | Videos, pesos `.pt` y exportaciones experimentales |
| Documentación Markdown y diagramas seleccionados | Duplicados históricos `MVP/FrontEnd/` y `MVP/BackEnd/` |
| `backend/data/demo_parcial_provisional.json` | El resto de `backend/data/` |

Las imágenes de marca en `frontend/public/` sí se incluyen. No se ignoran globalmente todos los JSON, CSV o PNG: algunos son código/configuración, muestras o documentación necesaria. El diagrama histórico fue trasladado a `docs/diagramas/` para conservarlo al excluir el frontend duplicado.

## Cómo funciona .gitignore

- `PTY4614_800D_Fut.ai/.gitignore` contiene reglas generales y excluye el archivo de respaldo `MVP.rar` de la raíz.
- `MVP/.gitignore` contiene reglas de dependencias, videos, pesos, resultados y carpetas históricas del MVP.
- Los `.gitignore` de backend/frontend añaden reglas locales. Todos estos archivos se suben para compartir las exclusiones con el equipo.
- `MVP/.gitattributes` fija finales LF para código/documentación y CRLF para BAT. No se ejecutó una renormalización masiva.

Una regla `node_modules/` excluye directorios con ese nombre; `*.mp4` excluye esa extensión; `/FrontEnd/` se aplica sólo al FrontEnd de la carpeta que contiene el `.gitignore`. `!archivo` permite excepciones, como la muestra JSON. Para permitir un archivo dentro de una carpeta excluida también hay que permitir sus directorios padres.

Ejemplos desde la raíz Git:

```powershell
git check-ignore -v -- "MVP/Procesamiento/yolov8n.pt"
git check-ignore -v -- "MVP/FUTAI_DEMO_INTEGRADA/FUTAI_DEMO/backend/.env"
git status --short
git ls-files --others --exclude-standard -- MVP
```

`check-ignore -v` indica qué archivo y regla provocan la exclusión. Que un archivo no aparezca en Changes por estar ignorado no lo borra de tu disco. Desmarcarlo en Desktop sólo lo excluye de ese commit; una regla de ignore conserva esa decisión para cambios futuros. [Referencia oficial sobre exclusiones](https://docs.github.com/en/get-started/git-basics/ignoring-files).

## GitHub Desktop

1. Abre **File → Add local repository → Choose** y selecciona `PTY4614_800D_Fut.ai`, la carpeta que contiene `.git`. Pulsa **Add repository**. Si ya aparece en Desktop, selecciónala en **Current repository**.
2. Confirma **Current branch: Hector**. En **Changes**, revisa los archivos y sus diferencias.
3. Marca el `.gitignore` y el `README.md` de la raíz, junto con los cambios de `MVP/`. El README raíz enlaza la aplicación y las guías. Decide por separado si quieres incluir `FUTAI_PROJECT_STATUS_2026-10-19.md`, que está fuera de MVP. Los videos, entornos, modelos, SQLite y archivos comprimidos no deberían aparecer como archivos nuevos para subir.
4. Escribe un Summary, por ejemplo `Organiza MVP y documentación para GitHub`, y pulsa **Commit to Hector**. Esto guarda una versión local; todavía no la envía.
5. Pulsa **Push origin** para enviar los commits de esa rama al remoto existente. **Fetch origin** consulta cambios del remoto; no sube tus modificaciones sin commit.
6. Si el trabajo debe llegar a otra rama del equipo, abre **Branch → Create pull request** y revisa la rama de destino antes de crear la solicitud. Conservar `Hector` como rama de trabajo evita mezclar el primer ordenamiento con cambios de otras personas.

Desktop también permite agregar una regla desde el menú contextual **Ignore file** / **Ignore all ... files**. Revisa siempre el `.gitignore` resultante: ignorar todos los JSON o PNG ocultaría archivos necesarios.

Para un proyecto realmente nuevo y sin remoto se utiliza **Publish repository** y se elige nombre/visibilidad. Este proyecto ya tiene `origin`; el flujo normal aquí es **Commit → Push origin**. [Agregar un repositorio local](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-a-repository-from-your-local-computer-to-github-desktop), [revisar, confirmar y enviar cambios](https://docs.github.com/en/desktop/making-changes-in-a-branch/committing-and-reviewing-changes-to-your-project-in-github-desktop), [publicar un proyecto nuevo](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-an-existing-project-to-github-using-github-desktop).

## Consola PowerShell

### Si git no se reconoce

En este equipo GitHub Desktop incluye Git, aunque no está en PATH. Para usarlo sólo en la terminal actual:

```powershell
Set-Alias -Name git -Value "$env:LOCALAPPDATA\GitHubDesktop\app-3.6.7\resources\app\git\cmd\git.exe"
git --version
```

La versión de la carpeta cambia al actualizar Desktop. Como opción permanente, instala [Git for Windows](https://git-scm.com/download/win), habilita su uso desde consola en el instalador y abre una terminal nueva. El alias no cambia la configuración global del equipo.

### Publicar los cambios preparados

```powershell
Set-Location -LiteralPath "C:\Users\Hector\Documents\Duoc\Capstone\PTY4614_800D_Fut.ai"

git rev-parse --show-toplevel
git branch --show-current
git status --short

# Vista previa: respeta .gitignore y no agrega archivos al índice.
git add --dry-run -- .gitignore README.md MVP

# Preparar únicamente el MVP y sus reglas, después de revisar la vista previa.
git add -- .gitignore README.md MVP
git diff --cached --stat
git diff --cached --name-only

git commit -m "Organiza MVP y documentación para GitHub"
git push -u origin Hector
```

La autenticación la gestiona Git/GitHub; no escribas contraseñas o tokens dentro de URLs ni comandos que vayan a quedar en la documentación. Si el remoto rechaza el push por cambios de otra persona, consulta `git fetch origin` y revisa los commits antes de integrar; no uses un push forzado para resolverlo.

Para revisar las exclusiones antes de agregar archivos:

```powershell
git status --short --untracked-files=all -- MVP
git ls-files --others --exclude-standard -- MVP
git ls-files -ci --exclude-standard
```

El último comando muestra archivos **ya versionados** que ahora coinciden con reglas de ignore.

## Archivos que Git ya seguía

`.gitignore` sólo evita agregar archivos no versionados; no retira archivos del historial. En este repositorio había cuatro `.DS_Store` ya versionados. Para dejar de seguirlos, conservándolos en el disco, puedes ejecutar desde la raíz:

```powershell
git rm --cached --ignore-unmatch -- .DS_Store ":(glob)**/.DS_Store"
git diff --cached --name-status
git commit -m "Deja de versionar metadatos de macOS"
git push origin Hector
```

Si otra carpeta ya hubiera sido subida, utiliza una ruta específica, por ejemplo `git rm -r --cached -- "MVP/ruta/node_modules"`, y revisa los cambios preparados. No es necesario limpiar todo el índice para que funcionen estas reglas. Retirar un archivo con `--cached` conserva versiones anteriores en el historial; si se trataba de una credencial real, debe revocarse además de corregir el seguimiento.

## Archivos grandes

GitHub bloquea archivos de más de 100 MiB en Git normal y advierte a partir de 50 MiB. Los videos, modelos y ZIP no forman parte del código preparado aquí. Guarda su procedencia en [Datos y modelos](datos-y-modelos.md); si el equipo decide versionar binarios, configura Git LFS antes de agregarlos o utiliza Releases/almacenamiento externo. Las reglas actuales los ignoran; configurar LFS no anula `.gitignore` automáticamente. [Límites oficiales](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).
