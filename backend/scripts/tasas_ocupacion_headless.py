"""Procesamiento headless de tasas de ocupación desde contadores de pasajeros.
Adaptado de Raul/tasas_ocupacion/src/main.py para ejecución web.
"""
import os
import pandas as pd
from pathlib import Path
import holidays
import numpy as np

ASINT_HEADLESS = bool(os.environ.get('ASINT_HEADLESS'))

LISTA_ENCABEZADOS = [
    "RUT", "DV", "NOMBRE LINEA", "SERVICIO", "PPU", "Nº EXPEDICIÓN",
    "Fecha/hora Inicio Expedición", "Fecha/hora Fin Expedición",
    "Sentido", "Periodo", "Fecha/hora medición", "ID_PUERTA",
    "Cantidad de pasajeros de subida", "Cantidad de pasajeros de bajada",
    "Cantidad de pasajeros a bordo", "Tasa de ocupación", "INDICADOR MODO DE SERVICIO",
    "GPS_Latitud", "GPS_Longitud"
]

FERIADOS_CL = holidays.country_holidays('CL')

def clasificar_dia_vectorizado(fechas: pd.Series) -> pd.Series:
    es_feriado = fechas.isin(FERIADOS_CL)
    dow = fechas.dt.weekday  # 0=lunes ... 6=domingo
    return pd.Series(
        np.select(
            [es_feriado | (dow == 6), dow == 5],
            ["DD", "DS"],
            default="DL"
        ),
        index=fechas.index
    )

def procesar_archivo_txt(archivo_path):
    """Lee y procesa archivo TXT de contadores de pasajeros."""
    with open(archivo_path, "r") as file:
        primera_linea = file.readline().strip()

    num_campos = len(primera_linea.split(";"))
    nombres_temporales = [f"field_{i+1}" for i in range(num_campos)]

    df = pd.read_csv(archivo_path, sep=';', names=nombres_temporales, header=None, low_memory=False)
    mapeo = dict(zip(nombres_temporales, LISTA_ENCABEZADOS[:num_campos]))
    df = df.rename(columns=mapeo)

    col = 'Fecha/hora Inicio Expedición'
    if col in df.columns:
        df[col] = df[col].astype(str).str.split('-').str[0]
        df[col] = pd.to_datetime(df[col], format='%d/%m/%Y %H:%M:%S', cache=True)
        df['fecha'] = df[col]
        df['periodo'] = df[col].dt.hour
        df['suben'] = df['Cantidad de pasajeros de subida']
        df['id_expedicion'] = df['Nº EXPEDICIÓN']
        df['servicio'] = df['SERVICIO']

    return df

def calcular_pax_exp(df_filtrado: pd.DataFrame) -> pd.DataFrame:
    """Calcula pasajeros por expedición por período."""
    extracto = df_filtrado.pivot_table(
        index="periodo",
        columns="id_expedicion",
        values="suben",
        aggfunc="sum"
    )

    salida = pd.DataFrame()
    salida["conteo_expediciones"] = extracto.count(axis=1)
    salida["total_subidos"] = extracto.sum(axis=1)
    salida["pax/exp"] = (salida["total_subidos"] / salida["conteo_expediciones"]).round(2)
    return salida

def main():
    if ASINT_HEADLESS:
        input_file = os.environ.get('ASINT_INPUT_FILE')
        output_dir = os.environ.get('ASINT_OUTPUT_DIR')

        if not input_file or not output_dir:
            raise RuntimeError('ASINT_INPUT_FILE y ASINT_OUTPUT_DIR deben estar definidos en modo headless.')

        archivos_a_procesar = [Path(input_file)]
    else:
        # Modo interactivo (uso standalone)
        base_dir = Path(__file__).resolve().parent.parent.parent
        data_dir = base_dir / "Raul" / "tasas_ocupacion" / "data"
        output_dir = base_dir / "Raul" / "tasas_ocupacion" / "salida"
        archivos_a_procesar = [data_dir / "MNT_CONTADOR29901052026.txt"]
        output_dir = str(output_dir)

    # Crear directorio de salida si no existe
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    data_frames = []
    for f in archivos_a_procesar:
        if Path(f).exists():
            print(f"[TASAS] Procesando: {Path(f).name}")
            data_frames.append(procesar_archivo_txt(str(f)))

    if not data_frames:
        print("[TASAS] No se encontraron datos.")
        return

    df = pd.concat(data_frames, ignore_index=True)
    df["tipo_dia"] = clasificar_dia_vectorizado(df["fecha"])

    # Agrupar por servicio y generar archivos
    grupos_servicio = df.groupby("servicio")

    for servicio, df_servicio in grupos_servicio:
        nombre_archivo = Path(output_dir) / f"reporte_{servicio}.xlsx"
        print(f"[TASAS] Generando: {servicio} -> {nombre_archivo.name}")

        with pd.ExcelWriter(str(nombre_archivo), engine="openpyxl") as writer:
            grupos_internos = df_servicio.groupby(["tipo_dia", "Sentido"])

            for (tipo_dia, sentido), df_grupo in grupos_internos:
                resultado = calcular_pax_exp(df_grupo)
                nombre_hoja = f"{tipo_dia}_{sentido}"[:31]
                resultado.to_excel(writer, sheet_name=nombre_hoja)

    print(f"[TASAS] Proceso finalizado. Archivos en: {output_dir}")

if __name__ == "__main__":
    main()
