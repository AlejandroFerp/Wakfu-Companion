# Prototipo de escritorio para Windows

El ejecutable reutiliza la interfaz web y abre una ventana de aplicación de Microsoft Edge. Busca `wakfu_chat.log` en la ruta de Ankama del usuario y solo procesa eventos nuevos desde que se conecta. Para cerrar el proceso, utiliza «Salir de la aplicación».

La compilación de GitHub Actions empaqueta los archivos de `public`, compila `desktop.go` y publica el ejecutable en Releases. El prototipo requiere Microsoft Edge instalado. No incorpora OCR ni confirma el inicio o fin de turno por pantalla.

Portal Celestial se reconoce al observar su estado. La cuenta de dos finales solo se activa con una fuente que identifique el personaje cuyo turno terminó; los avisos anónimos del registro no sirven para confirmar esa atribución.
