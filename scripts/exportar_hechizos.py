"""Exporta descripciones del juego instalado para uso local en el navegador."""
import argparse
import json
import re
import zipfile
from collections import defaultdict
from pathlib import Path


def exportar(archivo, destino):
    with zipfile.ZipFile(archivo) as jar:
        texto = jar.read('texts_es.properties').decode('latin-1')
    nombres, descripciones = {}, {}
    for linea in texto.splitlines():
        m = re.match(r'^content\.(3|4)\.(\d+)=(.*)$', linea)
        if m:
            valor = m.group(3).replace(r'\n', '\n').replace(r'\:', ':').strip()
            (nombres if m.group(1) == '3' else descripciones)[m.group(2)] = valor
    por_nombre = defaultdict(set)
    for identificador, nombre in nombres.items():
        descripcion = descripciones.get(identificador)
        if nombre and descripcion:
            por_nombre[nombre].add(descripcion)
    # Los nombres ambiguos no se asocian a una descripción arbitraria.
    hechizos = {nombre: next(iter(valores)) for nombre, valores in por_nombre.items() if len(valores) == 1}
    Path(destino).write_text(json.dumps({'version': 1, 'hechizos': hechizos}, ensure_ascii=False), encoding='utf-8')
    return len(hechizos)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archivo', help='Ruta al archivo i18n_es.jar del juego')
    parser.add_argument('destino', help='Archivo JSON local que se va a crear')
    args = parser.parse_args()
    print(f'{exportar(args.archivo, args.destino)} descripciones exportadas')

