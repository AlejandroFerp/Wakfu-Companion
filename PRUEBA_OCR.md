# Prueba de reconocimiento de números

`scripts/probar_ocr_numeros.ps1` usa el OCR integrado de Windows para leer un recorte de una imagen local. Se ejecuta con Windows PowerShell 5.1 y un idioma de OCR instalado:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/probar_ocr_numeros.ps1 <imagen.png> <x> <y> <ancho> <alto>
```

Las coordenadas están expresadas en píxeles relativos a la imagen. El resultado es un número o `SIN_LECTURA` cuando el OCR devuelve caracteres ambiguos. La prueba no envía ni guarda las imágenes. La lectura todavía no está conectada a la ventana del juego ni al ejecutable; no debe utilizarse como un valor fiable en combate sin una validación adicional.
