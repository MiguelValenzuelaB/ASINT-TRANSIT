"""
Punto de entrada headless del cálculo del Indicador de Puntualidad (IP)
para ejecución vía web.

A diferencia de main.py (que recorre carpetas data/<empresa>/<mes>/ y elige
el A5 vigente automáticamente), aquí recibimos por variables de entorno los
dos archivos ya subidos por el usuario (expediciones del mes + A5) y la
empresa, y procesamos ese único mes.

Variables de entorno:
    ASINT_EXPEDICIONES_FILE  ruta al .xls de expediciones (HTML exportado)
    ASINT_A5_FILE            ruta al .xlsx A5 (Lista de Pasadas Programadas)
    ASINT_OUTPUT_DIR         carpeta de salida
    ASINT_EMPRESA            "lider" | "toptur" (solo para nombrar el reporte)
    ASINT_FORMATO_EXPEDICIONES  "html" (default) | "csv"
"""
import os
from pathlib import Path

import pandas as pd

from src.io_utils import cargar_lpo, cargar_lpp, construir_lpo_largo
from src.pipeline import calcular_ip_mensual, calcular_resultados
from src.exportar import exportar_reporte_excel

MESES_NOMBRE = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril", 5: "Mayo", 6: "Junio",
    7: "Julio", 8: "Agosto", 9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
}


def main() -> None:
    expediciones_path = os.environ.get("ASINT_EXPEDICIONES_FILE")
    a5_path = os.environ.get("ASINT_A5_FILE")
    output_dir = os.environ.get("ASINT_OUTPUT_DIR")
    empresa = os.environ.get("ASINT_EMPRESA", "lider").upper()
    formato = os.environ.get("ASINT_FORMATO_EXPEDICIONES", "html")

    if not expediciones_path or not a5_path or not output_dir:
        raise RuntimeError(
            "Se requieren ASINT_EXPEDICIONES_FILE, ASINT_A5_FILE y ASINT_OUTPUT_DIR."
        )

    salida = Path(output_dir)
    salida.mkdir(parents=True, exist_ok=True)

    # 1. Carga de datos
    print(f"[IP] Empresa: {empresa}")
    print(f"[IP] Leyendo A5: {Path(a5_path).name}")
    df_a5 = cargar_lpp(a5_path)

    print(f"[IP] Leyendo expediciones: {Path(expediciones_path).name}")
    df_expediciones = cargar_lpo(expediciones_path, formato=formato)
    df_lpo = construir_lpo_largo(df_expediciones)

    # 2. Cálculo del IP por TPP
    fechas = df_expediciones["fecha"].unique()
    df_resultados = calcular_resultados(df_a5, df_lpo, fechas)

    if df_resultados.empty:
        print("[IP] No se generaron resultados: revisa el cruce Servicio/Sentido/PC/Tipo de día.")
        return

    # 3. Agregación final
    ip_promedio, ip_final = calcular_ip_mensual(df_resultados)
    print(f"[IP] IP_M' = {ip_promedio}  ->  IP_M = {ip_final}")

    # 4. Derivar mes/anio desde la primera fecha de las expediciones
    primera = pd.Timestamp(min(fechas))
    mes_nombre = MESES_NOMBRE.get(primera.month, str(primera.month))
    anio_str = str(primera.year)

    # 5. Exportación a Excel
    exportar_reporte_excel(
        df_resultados, salida, empresa=empresa, mes=mes_nombre, anio=anio_str
    )
    print("[IP] Proceso completado.")


if __name__ == "__main__":
    main()
