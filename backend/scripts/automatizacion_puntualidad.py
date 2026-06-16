#Version 0.1 funciona si se ocupa la normalización, Formato A5
#creacion por JOSUE OSORIO analista, en miras de automatizacion de analisis
#Adaptado para ejecucion headless via web (parametros por variables de entorno)

import os

ASINT_HEADLESS = bool(os.environ.get('ASINT_HEADLESS'))
if ASINT_HEADLESS:
    import matplotlib
    matplotlib.use('Agg')

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import seaborn as sns
import warnings

warnings.filterwarnings("ignore")

# --- Entradas ---
op_file = os.environ.get('ASINT_OP_FILE')
a5_file = os.environ.get('ASINT_A5_FILE')
carpeta_salida = os.environ.get('ASINT_OUTPUT_DIR')

if ASINT_HEADLESS:
    if not op_file or not a5_file:
        raise RuntimeError('ASINT_OP_FILE y ASINT_A5_FILE deben estar definidos en modo headless.')
    if not carpeta_salida:
        raise RuntimeError('ASINT_OUTPUT_DIR debe estar definido en modo headless.')
    BD1 = pd.read_excel(op_file)
    BD2 = pd.read_excel(a5_file)
    nombre1 = os.path.splitext(os.path.basename(op_file))[0]
else:
    # Modo interactivo (uso standalone por consola)
    base_de_datos = r"E:\ASINT\Pagina_web_abr2026\App_piloto_transporte _v2\Codigo\IP"
    carpeta_salida = carpeta_salida or r"E:\ASINT\Pagina_web_abr2026\App_piloto_transporte _v2\Codigo\IP\salida"

    def leer_excel(nombre_archivo):
        ruta_completa = os.path.join(base_de_datos, nombre_archivo)
        return pd.read_excel(ruta_completa)

    nombre1 = input(">OP")
    nombre2 = input(">A5")
    BD1 = leer_excel(nombre1 + ".xlsx")
    BD2 = leer_excel(nombre2 + ".xlsx")

os.makedirs(carpeta_salida, exist_ok=True)

# --- Procesamiento ---
Bd_inicial_EX = BD1[["Fecha","Variante","Estado","Dirección","Tipo de Día","Período","01","Con Despacho Asociado"]]
Bd_inicial_EX = Bd_inicial_EX.rename(columns={"Variante": "Servicio","Dirección":"Sentido"})
Bd_inicial_A5 = BD2[["Servicio","Sentido","Anterior","Hora programada","Posterior","Tipo de Día"]]

Bd_inicial_A5["ID"] = np.arange(1, len(Bd_inicial_A5)+1)
Bd_inicial_A5["ID"] = (Bd_inicial_A5["ID"]).astype(str)

Bd_inicial_A5["Anterior"] = pd.to_timedelta(Bd_inicial_A5["Anterior"].astype(str))
Bd_inicial_A5["Hora programada"] = pd.to_timedelta(Bd_inicial_A5["Hora programada"].astype(str))
Bd_inicial_A5["Posterior"] = pd.to_timedelta(Bd_inicial_A5["Posterior"].astype(str))

Bd_inicial_EX["01"] = pd.to_timedelta(Bd_inicial_EX["01"].astype(str))
Bd_inicial_EX["Fecha"] = Bd_inicial_EX["Fecha"].astype(str)

Bd_inicial_A5["Hora_anterior"] = Bd_inicial_A5["Hora programada"] - Bd_inicial_A5["Anterior"]
Bd_inicial_A5["Hora_posterior"] = Bd_inicial_A5["Hora programada"] + Bd_inicial_A5["Posterior"]

Reemplazos = {
    "DLN":"DL",
    "DOM":"DF",
    "SAB":"DS",
    1:"Reg",
    0:"Ida",
    "R793_I":"R793",
    "R796_I":"R796",
    "R799_I":"R799",
    "R801_I":"R801",
    "R800_R":"R800",
    "R790V_R":"R790V",
}
Bd_inicial_EX["Tipo de Día"] = Bd_inicial_EX["Tipo de Día"].replace(Reemplazos)
Bd_inicial_EX["Servicio"] = Bd_inicial_EX["Servicio"].replace(Reemplazos)
Bd_inicial_A5["Sentido"] = Bd_inicial_A5["Sentido"].replace(Reemplazos)

for col in ["Servicio","Sentido","Tipo de Día"]:
    Bd_inicial_A5[col] = Bd_inicial_A5[col].astype(str)
    Bd_inicial_EX[col] = Bd_inicial_EX[col].astype(str)

Bd_inicial_A5["key"] = Bd_inicial_A5["Servicio"]+Bd_inicial_A5["Sentido"]+Bd_inicial_A5["Tipo de Día"]+Bd_inicial_A5["ID"]

Bd_not_match = Bd_inicial_EX
Bd_inicial_EX = Bd_inicial_EX[Bd_inicial_EX["Estado"]=="Válida"]

Bd_unida = Bd_inicial_EX.merge(
    Bd_inicial_A5[[
        "Servicio", "Sentido", "Tipo de Día",
        "Anterior", "Hora programada", "Posterior",
        "Hora_anterior", "Hora_posterior","ID","key"
    ]],
    on=["Servicio", "Sentido", "Tipo de Día"],
    how="left"
)
Bd_unida = pd.DataFrame(Bd_unida)

Bd_unida["coincidencia"] = (
    (Bd_unida["01"] >= Bd_unida["Hora_anterior"]) &
    (Bd_unida["01"] <= Bd_unida["Hora_posterior"])
)

Bd_Filtrada = Bd_unida[Bd_unida["coincidencia"]].copy()

#-0,25
Bd_Filtrada["Anterior_0,25"] = Bd_Filtrada["Hora programada"]-(Bd_Filtrada["Anterior"]/3)
Bd_Filtrada["Anterior_0,25_2"] = Bd_Filtrada["Hora programada"]-(Bd_Filtrada["Anterior"]/4)
#-0,5
Bd_Filtrada["Anterior_0,5"] = Bd_Filtrada["Hora programada"]-(Bd_Filtrada["Anterior"]/4)
Bd_Filtrada["Anterior_0,5_2"] = Bd_Filtrada["Hora programada"]-(Bd_Filtrada["Anterior"]/6)
#-0,75
Bd_Filtrada["Anterior_0,75"] = Bd_Filtrada["Hora programada"]-(Bd_Filtrada["Anterior"]/6)
Bd_Filtrada["Anterior_0,75_2"] = Bd_Filtrada["Hora programada"]-(Bd_Filtrada["Anterior"]/12)
#1
Bd_Filtrada["Anterior_1"] = Bd_Filtrada["Hora programada"]-(Bd_Filtrada["Anterior"]/12)
Bd_Filtrada["Posterior_1"] = Bd_Filtrada["Hora programada"]+(Bd_Filtrada["Posterior"]/6)
#0,75
Bd_Filtrada["Posterior_0,75"] = Bd_Filtrada["Hora programada"]+(Bd_Filtrada["Posterior"]/6)
Bd_Filtrada["Posterior_0,75_2"] = Bd_Filtrada["Hora programada"]+(Bd_Filtrada["Posterior"]/3)
#0,5
Bd_Filtrada["Posterior_0,5"] = Bd_Filtrada["Hora programada"]+(Bd_Filtrada["Posterior"]/3)
Bd_Filtrada["Posterior_0,5_2"] = Bd_Filtrada["Hora programada"]+(Bd_Filtrada["Posterior"]/2)
#0.25
Bd_Filtrada["Posterior_0,25"] = Bd_Filtrada["Hora programada"]+(Bd_Filtrada["Posterior"]/2)
Bd_Filtrada["Posterior_0,25_2"] = Bd_Filtrada["Hora programada"]+(Bd_Filtrada["Posterior"]*(2/3))

Condiciones = [
    #1
    (Bd_Filtrada["01"]>=Bd_Filtrada["Anterior_1"]) & (Bd_Filtrada["01"]<=Bd_Filtrada["Posterior_1"]),
    #0,75
    ((Bd_Filtrada["01"]>=Bd_Filtrada["Anterior_0,75"]) & (Bd_Filtrada["01"]<Bd_Filtrada["Anterior_0,75_2"]))|
    ((Bd_Filtrada["01"]>Bd_Filtrada["Posterior_0,75"]) & (Bd_Filtrada["01"]<=Bd_Filtrada["Posterior_0,75_2"])),
    #0,5
    ((Bd_Filtrada["01"]>=Bd_Filtrada["Anterior_0,5"]) & (Bd_Filtrada["01"]<Bd_Filtrada["Anterior_0,5_2"]))|
    ((Bd_Filtrada["01"]>Bd_Filtrada["Posterior_0,5"]) & (Bd_Filtrada["01"]<=Bd_Filtrada["Posterior_0,5_2"])),
    #0,25
    ((Bd_Filtrada["01"]>=Bd_Filtrada["Anterior_0,25"]) & (Bd_Filtrada["01"]<Bd_Filtrada["Anterior_0,25_2"]))|
    ((Bd_Filtrada["01"]>Bd_Filtrada["Posterior_0,25"]) & (Bd_Filtrada["01"]<=Bd_Filtrada["Posterior_0,25_2"])),
]

Puntajes = [1, 0.75, 0.5, 0.25]

Bd_Filtrada["Indicador"] = np.select(Condiciones, Puntajes, default=0.0)

Bd_Filtrada["key2"] = Bd_Filtrada["Fecha"]+Bd_Filtrada["key"]
Bd_Filtrada = Bd_Filtrada.sort_values(by=["key2","Indicador"], ascending=[True, False])
Bd_Filtrada = Bd_Filtrada.drop_duplicates(subset=["key2"], keep="first")

Bd_unida_not_match = Bd_not_match.merge(
    Bd_inicial_A5[[
        "Servicio", "Sentido", "Tipo de Día",
        "Anterior", "Hora programada", "Posterior",
        "Hora_anterior", "Hora_posterior","ID","key"
    ]],
    on=["Servicio", "Sentido", "Tipo de Día"],
    how="left"
)
Bd_unida_not_match = pd.DataFrame(Bd_unida_not_match)

Bd_unida_not_match["key2"] = Bd_unida_not_match["Fecha"]+Bd_unida_not_match["key"]
Bd_unida_not_match = Bd_unida_not_match.sort_values(by=["key2","01"])
Bd_unida_not_match = Bd_unida_not_match.drop_duplicates(subset=["key2"], keep="first")
Bd_unida_not_match["Indicador"] = 0

Exp_FR = Bd_unida_not_match[~Bd_unida_not_match["key2"].isin(Bd_Filtrada["key2"])]
Exp_FR = Exp_FR.dropna(subset=["key"])
Bd_final = pd.concat([Bd_Filtrada, Exp_FR], ignore_index=True)

Bd_final["Delta"] = abs(Bd_final["01"]-Bd_final["Hora programada"])

Condiciones2 = [
    #A tiempo
    (Bd_final["01"]>=Bd_final["Anterior_1"]) & (Bd_final["01"]<=Bd_final["Posterior_1"]),
    #Adelantado
    (Bd_final["01"]>=Bd_final["Anterior_0,25"]) & (Bd_final["01"]<=Bd_final["Anterior_0,75_2"]),
    #Atrasado
    ((Bd_final["01"]>=Bd_final["Posterior_0,75"]) & (Bd_final["01"]<Bd_final["Posterior_0,25_2"])),
]
Puntajes2 = ["A tiempo", "Adelantado", "Atrasado"]
default_text = "Invalida/Fuera de Rango"

Bd_final["Estatus"] = np.select(Condiciones2, Puntajes2, default=default_text)

Excel = os.path.join(carpeta_salida, "puntualidad_PBI"+nombre1+".xlsx")
Bd_final.to_excel(Excel, index=False)
print(f"[IP] Guardado: {Excel}")

#Bd para el ploteo
Bd_plot = Bd_final[["Fecha","Servicio","Estado","Sentido","Tipo de Día","01","Hora_anterior","Hora programada","Hora_posterior","Estatus","Indicador"]]
Bd_plot["Recorrido"] = Bd_final["Servicio"]+" - "+Bd_final["Sentido"]
Bd_plot["Indicador"] = Bd_plot["Indicador"]*100
#Bd para excel
Bd_final_v2 = Bd_final[["Fecha","Servicio","Sentido","Tipo de Día","Hora programada","Delta","Estatus","Indicador"]]
#Bd para reporte semanal
Bd_semanal = Bd_final_v2.groupby("Fecha")["Indicador"].mean().reset_index()
Bd_semanal["Indicador"] = Bd_final_v2["Indicador"]*100

fecha_de_hoy = datetime.now()
fecha_ayer = fecha_de_hoy - timedelta(days=1)
fecha_texto = fecha_ayer.strftime("%d-%m-%Y")

# Gráfico 1: por Recorrido
plt.figure(figsize=(20,12))
grafico = sns.barplot(x="Recorrido", y="Indicador", data=Bd_plot)

for p in grafico.patches:
    grafico.annotate(
        f'{p.get_height():.1f}%',
        (p.get_x()+p.get_width()/2., p.get_height()),
        ha="center",
        va="center",
        xytext=(0,9),
        textcoords="offset points")

plt.title("Indicador de puntualidad - "+fecha_texto, fontsize=16)
plt.xlabel("Servicio")
plt.ylabel("Indicador")
plt.tight_layout()

chart1 = os.path.join(carpeta_salida, "Puntualidad"+nombre1+".jpg")
plt.savefig(chart1)
print(f"[IP] Guardado: {chart1}")
if not ASINT_HEADLESS:
    plt.show()
plt.close()

# Gráfico 2: por Fecha
plt.figure(figsize=(20,12))
grafico = sns.barplot(x="Fecha", y="Indicador", data=Bd_plot)

for p in grafico.patches:
    grafico.annotate(
        f'{p.get_height():.0f}%',
        (p.get_x()+p.get_width()/2., p.get_height()),
        ha="center",
        va="center",
        xytext=(0,9),
        textcoords="offset points")

plt.title("Indicador de puntualidad mensual - "+fecha_texto, fontsize=16)
plt.xlabel("Fecha")
plt.ylabel("Indicador")
plt.tight_layout()

chart2 = os.path.join(carpeta_salida, "Puntualidad"+nombre1+"Mensual"+".jpg")
plt.savefig(chart2)
print(f"[IP] Guardado: {chart2}")
if not ASINT_HEADLESS:
    plt.show()
plt.close()

Excel2 = os.path.join(carpeta_salida, "puntualidad"+nombre1+".xlsx")
Bd_final_v2.to_excel(Excel2, index=False)
print(f"[IP] Guardado: {Excel2}")
print("[IP] Proceso completado.")
