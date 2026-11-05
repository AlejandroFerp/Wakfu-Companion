"""Prepara iconos locales a partir de los archivos del Wakfu instalado.

Requiere Pillow. La relación de identificadores incluida procede de un catálogo
de Zenith y debe revisarse al actualizar el juego. Los nombres ambiguos no se
asocian a ningún icono.
"""
import argparse
import base64
import io
import json
import re
import zipfile
from collections import defaultdict
from pathlib import Path

from PIL import Image


def exportar(textos, graficos, destino):
    mapping = json.loads(Path(__file__).with_name('spell-gfx.json').read_text(encoding='utf8'))['relaciones']
    nombres = {}
    with zipfile.ZipFile(textos) as jar:
        for raw in jar.read('texts_es.properties').splitlines():
            try:
                line = raw.decode('utf8')
            except UnicodeDecodeError:
                line = raw.decode('latin1')
            match = re.match(r'^content\.3\.(\d+)=(.*)$', line)
            if match:
                nombres[match[1]] = match[2].replace(r'\:', ':').strip()
    por_nombre = defaultdict(set)
    for spell_id, gfx_id in mapping.items():
        if nombres.get(spell_id) and gfx_id.isdigit():
            por_nombre[nombres[spell_id]].add(gfx_id)
    iconos = {}
    with zipfile.ZipFile(graficos) as jar:
        archivos = set(jar.namelist())
        for nombre, ids in por_nombre.items():
            if len(ids) != 1:
                continue
            archivo = f'icons/spells/64/{next(iter(ids))}.tga'
            if archivo not in archivos:
                continue
            with Image.open(io.BytesIO(jar.read(archivo))) as image:
                image = image.convert('RGBA')
                image.thumbnail((48, 48), Image.Resampling.LANCZOS)
                image = image.quantize(colors=128, method=Image.Quantize.FASTOCTREE)
                output = io.BytesIO()
                image.save(output, format='PNG', optimize=True)
            iconos[nombre] = 'data:image/png;base64,' + base64.b64encode(output.getvalue()).decode('ascii')
    Path(destino).write_text(json.dumps({'version': 1, 'iconos': iconos}, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
    return len(iconos)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('textos', help='Ruta al archivo i18n_es.jar del juego')
    parser.add_argument('graficos', help='Ruta al archivo gui.jar del juego')
    parser.add_argument('destino', help='Archivo JSON local que se va a crear')
    args = parser.parse_args()
    print(f'{exportar(args.textos, args.graficos, args.destino)} iconos exportados')
