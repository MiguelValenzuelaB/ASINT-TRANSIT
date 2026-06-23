"""
Punto de entrada headless del cálculo del Índice de Regularidad (IR)
para ejecución vía web.

Modularización del notebook Regularidad.ipynb (creación original por Josué
Osorio). Recibe por variables de entorno los tres archivos subidos y la
carpeta de salida, y genera un Excel con el detalle de regularidad.

Variables de entorno:
    ASINT_EXPEDICIONES_FILE  expediciones / operación (BD1, .xlsx)
    ASINT_PO_FILE            programación de operación (PO, .xlsx)
    ASINT_PC_IR_FILE         puntos de control IR + ponderadores (.xlsx)
    ASINT_OUTPUT_DIR         carpeta de salida
"""
import os
from pathlib import Path
import warnings

import pandas as pd
import numpy as np

warnings.filterwarnings("ignore")


def safe_drop(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    """Dropea columnas si existen, sin error si faltan."""
    return df.drop(columns=[c for c in cols if c in df.columns])


def main() -> None:
    exp_file = os.environ.get("ASINT_EXPEDICIONES_FILE")
    po_file = os.environ.get("ASINT_PO_FILE")
    pc_ir_file = os.environ.get("ASINT_PC_IR_FILE")
    output_dir = os.environ.get("ASINT_OUTPUT_DIR")

    if not exp_file or not po_file or not pc_ir_file or not output_dir:
        raise RuntimeError(
            "Se requieren ASINT_EXPEDICIONES_FILE, ASINT_PO_FILE, ASINT_PC_IR_FILE y ASINT_OUTPUT_DIR."
        )

    salida = Path(output_dir)
    salida.mkdir(parents=True, exist_ok=True)

    # --- Lectura ---
    print(f"[IR] Leyendo expediciones: {Path(exp_file).name}")
    BD1 = pd.read_excel(exp_file)
    print(f"[IR] Leyendo PO: {Path(po_file).name}")
    PO = pd.read_excel(po_file)
    print(f"[IR] Leyendo PC-IR: {Path(pc_ir_file).name}")
    PC_IR = pd.read_excel(pc_ir_file)

    # --- Limpieza de datos ---
    col_drop = {
        "BD1": ["Bus", "Conductor", "Causa", "Tipo Demanda", "Frecuencia Exigida"],
        "PO": ["Horario"],
        "PC_IR": ["Longitud", "Latitud", "Distancia al origen", "Seguimiento", "IP", "Punto Urbano"],
    }
    BD1_1 = safe_drop(BD1, col_drop["BD1"])
    PO_1 = safe_drop(PO, col_drop["PO"])
    PC_IR_1 = safe_drop(PC_IR, col_drop["PC_IR"])

    # --- Normalización ---
    Reemplazo = {
        0: "Ida",
        1: "Reg",
        "Laboral": "DLN",
        "Sábado": "SAB",
        "Domingo": "DOM",
        "R793_I": "R793",
        "R796_I": "R796",
        "R799_I": "R799",
        "R801_I": "R801",
        "R800_R": "R800",
        "R790V_R": "R790V",
    }
    PO_1["Tipo de Día"] = PO_1["Tipo de Día"].replace(Reemplazo)
    BD1_1["Variante"] = BD1_1["Variante"].replace(Reemplazo)
    PC_IR_1["Sentido"] = PC_IR_1["Sentido"].replace(Reemplazo)

    # --- Solo válidas ---
    BD1_1 = BD1_1[BD1_1["Estado"] == "Válida"]

    # --- Creación de keys ---
    BD1_1["key"] = (
        BD1_1["Período"].astype(str) + BD1_1["Variante"].astype(str)
        + BD1_1["Dirección"] + BD1_1["Tipo de Día"]
    )
    BD1_1["key2"] = (
        BD1_1["Fecha"].astype(str) + BD1_1["Período"].astype(str)
        + BD1_1["Variante"].astype(str) + BD1_1["Dirección"] + BD1_1["Tipo de Día"]
    )
    BD1_1["key3"] = BD1_1["Variante"].astype(str) + BD1_1["Dirección"]
    PO_1["key"] = (
        PO_1["Período"].astype(str) + PO_1["Servicio"].astype(str)
        + PO_1["Sentido"] + PO_1["Tipo de Día"]
    )
    PC_IR_1["key3"] = PC_IR_1["Servicio"].astype(str) + PC_IR_1["Sentido"]

    # --- Lista de puntos de control regulados (ICR == 1) ---
    PC_IR_1 = PC_IR_1[PC_IR_1["ICR"] == 1]
    rango = PC_IR_1.groupby("key3")["Correlativo Punto de Control"].apply(list).to_dict()
    rango = {k: [f"{x:02}" for x in v] for k, v in rango.items()}

    BD1_1["01"] = pd.to_datetime(BD1_1["01"], format="%H:%M:%S", errors="coerce")
    BD1_1 = BD1_1.sort_values(by=["Fecha", "Variante", "Dirección", "01"]).reset_index(drop=True)

    # --- Intervalos exigidos desde PO ---
    PO_1["Intervalo exigido"] = (60 / PO_1["Frecuencia"]).round(2)
    PO_1["Intervalo exigido"] = pd.to_timedelta(PO_1["Intervalo exigido"], unit="m")

    Bd_union = BD1_1.merge(
        PO_1[["Frecuencia", "Intervalo exigido", "key"]], on=["key"], how="left"
    )
    Bd_union = pd.DataFrame(Bd_union)
    Bd_union_x = pd.DataFrame(Bd_union)

    # --- Asegurar operabilidad (a datetime las columnas de hora) ---
    for col in Bd_union.columns:
        if col not in ["key3", "key2"]:
            Bd_union[col] = pd.to_datetime(Bd_union[col], format="%H:%M:%S", errors="coerce")

    resultados = Bd_union.copy()
    Colm_ambiente = [c for c in Bd_union.columns if c not in ["key3", "key2"]]
    resultados[Colm_ambiente] = pd.NaT

    # --- Diferencias (intervalos observados) por key3 ---
    for key3, columnas in rango.items():
        df_key3 = Bd_union[Bd_union["key3"] == key3].copy()
        delta = df_key3[columnas].diff()
        resultados.loc[df_key3.index, columnas] = delta

    for col in Colm_ambiente:
        resultados[col] = resultados[col].apply(
            lambda x: x if pd.isna(x) else (pd.to_datetime("00:00:00") + x).time()
        )

    # --- Selección de PC regulados por MTT ---
    Set_col = sorted(set(sum(rango.values(), [])))
    PC_Selec = [col for col in Set_col if col in resultados.columns]
    dif_pc = resultados[PC_Selec].copy()

    Bd_union_x["ID"] = np.arange(1, len(Bd_union_x) + 1)
    dif_pc["ID"] = np.arange(1, len(dif_pc) + 1)
    dif_pc_colums = PC_Selec + ["ID"]

    Bd_maestra = Bd_union_x.merge(dif_pc[dif_pc_colums], on=["ID"], how="left")
    Bd_maestra = pd.DataFrame(Bd_maestra)

    # --- Diferencia observado vs exigido ---
    PC_Selec_y = [item + "_y" for item in PC_Selec]
    for col in PC_Selec_y:
        hrs_y = pd.to_timedelta(Bd_maestra[col].astype(str), errors="coerce")
        dif_O_E = hrs_y - Bd_maestra["Intervalo exigido"]
        Bd_maestra[col + "c"] = dif_O_E.where(dif_O_E.notna(), pd.NaT).abs()

    # --- Intervalos de puntaje ---
    Bd_maestra["I_1"] = 0.25 * Bd_maestra["Intervalo exigido"]
    Bd_maestra["I_0.75"] = 0.5 * Bd_maestra["Intervalo exigido"]
    Bd_maestra["I_0.25"] = 0.75 * Bd_maestra["Intervalo exigido"]

    Puntajes = [1, 0.75, 0.5, 0.25, 0]
    PC_Selec_y = [item + "c" for item in PC_Selec_y]

    for col in PC_Selec_y:
        if Bd_maestra[col].isna().all():
            continue
        condiciones = [
            (Bd_maestra[col] <= (Bd_maestra["I_1"])),
            (Bd_maestra[col] > (Bd_maestra["I_1"])) & (Bd_maestra[col] <= (Bd_maestra["I_0.75"])),
            (Bd_maestra[col] > (Bd_maestra["I_0.75"])) & (Bd_maestra[col] <= (Bd_maestra["I_0.25"])),
            (Bd_maestra[col] > (Bd_maestra["I_0.25"])) & (Bd_maestra[col] <= (Bd_maestra["Intervalo exigido"])),
            (Bd_maestra[col] >= (Bd_maestra["Intervalo exigido"])),
        ]
        Bd_maestra[col + "d"] = np.select(condiciones, Puntajes, default=np.nan)

    # --- Tabla de ponderadores ---
    Bd_ponderacion = PC_IR_1[["key3", "Correlativo Punto de Control", "Ponderador ICR"]]
    Bd_ponderacion["Correlativo Punto de Control"] = Bd_ponderacion[
        "Correlativo Punto de Control"
    ].apply(lambda x: f"{x:02d}_ycd")
    Bd_ponderacion = Bd_ponderacion.pivot_table(
        index="key3",
        columns="Correlativo Punto de Control",
        values="Ponderador ICR",
        aggfunc="first",
    ).reset_index()

    # --- Unión final ---
    Bd_final = Bd_maestra.merge(Bd_ponderacion, on="key3", suffixes=("_1", "_2"))

    # --- Limpieza final ---
    Bd_final = safe_drop(Bd_final, ["key", "key2", "key3", "ID"])

    excel = salida / "Regularidad1_1.xlsx"
    Bd_final.to_excel(excel, index=False)
    print(f"[IR] Reporte exportado a {excel}")
    print("[IR] Proceso completado.")


if __name__ == "__main__":
    main()
