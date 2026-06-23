"""
Punto de entrada headless del cálculo del Índice de Cumplimiento de
Frecuencia (ICF) para ejecución vía web.

A diferencia de main.py (que recorre carpetas data/<empresa>/<mes>/ y busca
las frecuencias fijas automáticamente), aquí recibimos por variables de
entorno los dos archivos ya subidos por el usuario (expediciones del mes +
frecuencias fijas A1) y la empresa, y procesamos ese único mes.

Variables de entorno:
    ASINT_EXPEDICIONES_FILE  ruta al .xls de expediciones (HTML exportado)
    ASINT_FRECUENCIAS_FILE   ruta al .xlsx de frecuencias fijas (A1)
    ASINT_OUTPUT_DIR         carpeta de salida
    ASINT_EMPRESA            "lider" | "toptur" (solo para nombrar el reporte)
"""
import os
from pathlib import Path

from src.indicadores.icf import (
    calcular_psi,
    construir_resumenes_icf,
    crear_df_icf,
    exportar_resumenes_icf,
    tabla_periodo_vs_fecha,
)
from src.indicadores.io_icf import leer_expediciones, leer_frecuencias


def main() -> None:
    expediciones_path = os.environ.get("ASINT_EXPEDICIONES_FILE")
    frecuencias_path = os.environ.get("ASINT_FRECUENCIAS_FILE")
    output_dir = os.environ.get("ASINT_OUTPUT_DIR")
    empresa = os.environ.get("ASINT_EMPRESA", "lider").upper()

    if not expediciones_path or not frecuencias_path or not output_dir:
        raise RuntimeError(
            "Se requieren ASINT_EXPEDICIONES_FILE, ASINT_FRECUENCIAS_FILE y ASINT_OUTPUT_DIR."
        )

    salida = Path(output_dir)
    carpeta_reportes = salida / "reporte_servicio_sentido"
    salida.mkdir(parents=True, exist_ok=True)
    carpeta_reportes.mkdir(parents=True, exist_ok=True)

    # 1. Carga de datos
    print(f"[ICF] Empresa: {empresa}")
    print(f"[ICF] Leyendo expediciones: {Path(expediciones_path).name}")
    df_conteo = leer_expediciones(Path(expediciones_path))
    print(f"[ICF] Expediciones válidas leídas: {df_conteo['expediciones_observadas'].sum()}")

    print(f"[ICF] Leyendo frecuencias fijas: {Path(frecuencias_path).name}")
    df_base_exigida = leer_frecuencias(df_conteo, Path(frecuencias_path))

    # 2. Cálculo del ICF
    df_icf = crear_df_icf(df_base_exigida, df_conteo)
    df_icf["psi"] = calcular_psi(df_icf, mas_de_24_meses=True)

    combinaciones = (
        df_icf[["servicio", "sentido"]].drop_duplicates().sort_values(["servicio", "sentido"])
    )
    print(f"[ICF] Servicios/sentidos encontrados: {len(combinaciones)}")

    # 3. Reporte periodo x fecha por servicio/sentido
    for _, row in combinaciones.iterrows():
        servicio = row["servicio"]
        sentido = row["sentido"]
        tabla = tabla_periodo_vs_fecha(df_icf, servicio=servicio, sentido=sentido)
        nombre_archivo = f"{servicio}_{sentido}.xlsx"
        tabla.to_excel(carpeta_reportes / nombre_archivo)

    # 4. Resumen mensual del ICF
    tabla_por_tipo_demanda, icf_general, tabla_por_tipo_demanda_servicio = construir_resumenes_icf(
        df_icf
    )
    exportar_resumenes_icf(
        tabla_por_tipo_demanda,
        icf_general,
        tabla_por_tipo_demanda_servicio,
        salida / "reporte.xlsx",
    )
    print(f"[ICF] ICF_general = {icf_general}")
    print("[ICF] Proceso completado.")


if __name__ == "__main__":
    main()
