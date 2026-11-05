Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -AssemblyName System.Drawing
$null=[Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
$null=[Windows.Graphics.Imaging.BitmapDecoder,Windows.Foundation,ContentType=WindowsRuntime]
$null=[Windows.Storage.Streams.InMemoryRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime]
$null=[Windows.Storage.Streams.DataWriter,Windows.Storage.Streams,ContentType=WindowsRuntime]
$opmethod=([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {$_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'})[0]
function Await-Op($op,$type) { $task=$opmethod.MakeGenericMethod($type).Invoke($null,@($op)); $task.GetAwaiter().GetResult() }
if ($args.Count -ne 5) { throw "Uso: powershell -File probar_ocr_numeros.ps1 <imagen> <x> <y> <ancho> <alto>" }
$path = $args[0]
$img=[System.Drawing.Image]::FromFile($path)
$bitmap=New-Object System.Drawing.Bitmap ([int]$args[3]*5),([int]$args[4]*5)
$gfx=[System.Drawing.Graphics]::FromImage($bitmap)
$gfx.DrawImage($img,(New-Object System.Drawing.Rectangle 0,0,([int]$args[3]*5),([int]$args[4]*5)),(New-Object System.Drawing.Rectangle ([int]$args[1]),([int]$args[2]),([int]$args[3]),([int]$args[4])),[System.Drawing.GraphicsUnit]::Pixel)
$ms=New-Object System.IO.MemoryStream
$bitmap.Save($ms,[System.Drawing.Imaging.ImageFormat]::Png)
$stream=New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
$writer=New-Object Windows.Storage.Streams.DataWriter($stream.GetOutputStreamAt(0))
$writer.WriteBytes($ms.ToArray());$null=Await-Op ($writer.StoreAsync()) ([uint32]);$stream.Seek(0)
$decoder=Await-Op ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
$software=Await-Op ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
$engine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if (!$engine) { throw "El OCR de Windows no está disponible para el idioma configurado." }
$result=Await-Op ($engine.RecognizeAsync($software)) ([Windows.Media.Ocr.OcrResult])
$text=$result.Text.Trim()
if ($text -match '^\d{1,3}(?:[,.\s]\d{3})+$') { $text=$text -replace '[,.\s]','' }
if ($text -match '^\d+$') { Write-Output $text } else { Write-Output 'SIN_LECTURA' }
$gfx.Dispose();$bitmap.Dispose();$img.Dispose();$ms.Dispose()


