#%%
import os
# Modo headless (cuando lo invoca el backend de la plataforma)
ASINT_HEADLESS = bool(os.environ.get('ASINT_HEADLESS'))
if ASINT_HEADLESS:
    import matplotlib
    matplotlib.use('Agg')

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
#          0     21   22   23   24   25   26   27    28    29   30   31   32    33    34    35    36    37    38    39    40    41    42    43    44          45   
k = 28 # líneas, 710, 720, 730, 730, 750, 750, 790E, 790N, 820, 820, 840, UN01, UN02, UN03, UN04, UN05, UN06, UN07, UN07, UN08, UN09, UN11, UN13, UN03 Vill y UN04 Vill
#%% PRIMERA PARTE: TABLA HORARIOS CON TIEMPOS DE VIAJE
def horarios_per(salidas, hora_inicio, duracion):
    
    """
    Genera de manera equidistribuye los horarios 
    Arguments:
        salidas: numero de salidas requeridas
        hora_inicio: hora que inicie el rango de horarios
        duracion: duracion del 
    Returns:
        Lista de los horarios
    """
    if(salidas == 0):
        lista_horarios = []
    else:
        intervalo = duracion/salidas
        lista_horarios = [hora_inicio]
        hora = hora_inicio
        while(hora < (hora_inicio+(duracion-0.0001))):
            hora = hora + intervalo
            if(hora>=(hora_inicio+(duracion-0.0001))):
                break
            lista_horarios = lista_horarios + [hora]
    return lista_horarios

def f(x, y):
    f = []
    for i in range(len(x)):
        cuociente = x[i] / y[i]
        f = f + [cuociente]
    return f

def s(x,y):
    s = []
    for i in range(len(x)):
        suma = x[i] + y[i]
        s = s + [suma]
    return s

def vhdh(servicio, tipod, sent, dist, vel, hip, exp, d) :
    """funcion que retorna velocidad, horarios_bloque, demora, hora_llegada"""
    tv = f(dist, vel)
    
    horarios_bloque = []
    demora = []
    velocidad = []
    tipodia = []
    sentido = []
    distancia = []
    for i in range(len(hip)):
        horarios_bloque = horarios_bloque + horarios_per(exp[i], hip[i], d[i])
        tipodia = tipodia + [tipod[i]] * exp[i]
        sentido = sentido + [sent[i]] * exp[i]
        distancia = distancia + [dist[i]] * exp[i]
        demora = demora + [tv[i]]*len(horarios_per(exp[i], hip[i], d[i]))
        velocidad = velocidad + [vel[i]]*len(horarios_per(exp[i], hip[i], d[i]))
    
    hora_llegada = s(horarios_bloque, demora)
    
    df_temp = pd.DataFrame({
    'tipodia' : tipodia,
    'sentido' : sentido,
    'servicio': servicio,
    'distancia': distancia,
    'velocidad': velocidad,
    'horarios_bloque': horarios_bloque,
    'demora': demora,
    'hora_llegada':  hora_llegada
    })
    
    return df_temp
path_input = r'H:\Mi unidad\2026\FactoresProductivos\input\Diseño_POs_USs' + '/'
'''PROGRAMA PRINCIPAL'''
''' PRIMERA PARTE, horarios_Valpo_Int '''

# Permite que el archivo de entrada se especifique por variable de entorno (uso desde backend ASINT)
_input_file_env = os.environ.get('ASINT_INPUT_FILE')
_input_file = _input_file_env if _input_file_env else (path_input + "INPUT_heurística_2026.xlsx")
dicc_dfs = pd.read_excel(_input_file, sheet_name=None)
df_líneas  = dicc_dfs['Licitaciones_líneas']                                    #.iloc[0:2, 2:3]
#del(df_líneas['proceso'])

# Creamos el ID incremental reiniciado en cada racha consecutiva
df_líneas['ID_línea'] = df_líneas.groupby((df_líneas['unidad de servicio'] != df_líneas['unidad de servicio'].shift()).cumsum()).cumcount()

claves = list(dicc_dfs.keys())

# La hoja a procesar puede venir por variable de entorno (uso desde backend ASINT).
# Si no, cae al indice k=28 hardcodeado (compatibilidad con uso standalone).
_sheet_name_env = os.environ.get('ASINT_SHEET_NAME') if ASINT_HEADLESS else None
if _sheet_name_env:
    if _sheet_name_env not in dicc_dfs:
        raise ValueError(
            f"La hoja '{_sheet_name_env}' no existe en el Excel. "
            f"Hojas disponibles: {claves}"
        )
    clave = _sheet_name_env
    df = dicc_dfs[clave]
    unidad_servicio_heurística = clave.replace("INPUT_", "")
else:
    clave = claves[k]
    df = dicc_dfs[clave]
    lista_unidades_de_servicios = [s.replace("INPUT_", "") for s in claves[1:]]
    unidad_servicio_heurística = lista_unidades_de_servicios[k-1]

df_líneas_heurística = df_líneas[df_líneas['unidad de servicio'] == unidad_servicio_heurística]
#del(df_líneas_heurística['unidad de servicio'])
proceso = df_líneas_heurística['proceso'].unique()[0]

nombre_servicio = df_líneas_heurística.set_index('ID_línea')['línea'].to_dict()

# ['tipo dia', 'sentido', 'exp', 'dist', 'vel', 'exp.1', 'dist.1', 'vel.1' .....]
df.rename(columns = {'día':'tipo dia', 'sentido':'sentido'}, inplace = True)
df.drop('período', inplace=True, axis=1)

if ASINT_HEADLESS:
    horas_bloque = int(os.environ.get('ASINT_HORAS_BLOQUE', '18'))
else:
    while True:
        try:
            horas_bloque = int(input("horas_bloque:"))
            break
        except ValueError:
            print("horas_bloque debe ser un integer")

d = [1]*int(horas_bloque)

if ASINT_HEADLESS:
    hi = int(os.environ.get('ASINT_HORA_INICIO_BLOQUE', '6'))
else:
    while True:
        try:
            hi = int(input("hora_inicio_bloque: "))
            break
        except ValueError:
            print("hora_inicio debe ser un integer")
        
hip = [hi]
for i in range(len(d)-1):
    hip = hip + [hip[i]+d[i]]
    
n_servicios = len(nombre_servicio) # US1 22 US2 17 LIDER 4

#primera execucion para el E01
tipodia = df["tipo dia"]
sentido = df["sentido"]
exp = df["exp"]
dist = df["dist"]
vel = df["vel"]

df_result = vhdh(0, tipodia, sentido, dist, vel, hip, exp, d)

for i in range(1, n_servicios, 1) :
    tipodia = df["tipo dia"]
    sentido = df["sentido"]
    exp = df["exp."+str(i)]
    dist= df["dist."+str(i)]
    vel = df["vel."+str(i)]
    df_temp = vhdh(i, tipodia, sentido, dist, vel, hip, exp, d)
    
    df_result = pd.concat([df_result, df_temp])
    
df_result["horarios_bloque"] = df_result["horarios_bloque"] - (df_result["horarios_bloque"]// 24 * 24)
df_result["hora_llegada"] = df_result["hora_llegada"] - (df_result["hora_llegada"]// 24 * 24)

####################################################################################################
# corrige hora de llegada en los casos en que la expedición llega el día siguiente
# si la hora de llegada es inferior a la hora de salida, sumarle 24 a la hora de llegada

# Identificar las filas donde la duración es menor o igual a cero
mask = df_result['hora_llegada'] - df_result['horarios_bloque'] <= 0

# Sumar 24 a la columna 'fin' en las filas identificadas por la máscara
df_result.loc[mask, 'hora_llegada'] += 24
######################################################################################################


df_result["cabezal"] = np.where(df_result['sentido']=='ida', 0, 1)

orden_dia = {"Lab" : 0, "Sab" : 1, "Dom" : 2} 
df_result['orden_dia'] = df_result['tipodia'].map(orden_dia)

df_result = df_result.sort_values(by=["orden_dia", "horarios_bloque"])

'''
# incluir directamente el numero de servicio en Input
nombre_servicio = {
        0:'A', 1:'B', 2:'B_lento', 3:'B_rápido'
    }
'''
df_result["nombre_servicio"] = df_result['servicio'].map(nombre_servicio)

from pathlib import Path

# Permite que el directorio base de output se especifique por variable de entorno (uso desde backend ASINT)
_output_base_env = os.environ.get('ASINT_OUTPUT_DIR')
_output_base = Path(_output_base_env) if _output_base_env else Path(r'H:\Mi unidad\2026\FactoresProductivos\output\heurística_POs_USs_2026')
ruta = _output_base / proceso / unidad_servicio_heurística
ruta.mkdir(parents=True, exist_ok=True)  # Crea todos los niveles necesarios

ruta_archivo = ruta / 'df_result.xlsx'
df_result.to_excel(ruta_archivo, index = False)

# a este punto tenemos listo nuestro input para la segunda parte

#%% SEGUNDA PARTE: GRAFICAJE
''' SEGUNDA PARTE, graficaje_Valpo_Int '''

# FUNCIONES 'g', 'f' y 'p'

# asignación de la expedición siguiente para cada bus
def g(pos, matriz):
    '''estra función "g" retorna posicion_siguiente que cumple condición,
    o nada (None)'''
    j = pos
    if j > len(matriz)-1:
        return 'posición fuera de rango'
    for j in range(j, len(matriz)-1):
        # si le sens de la course suivante est differente du sens de la ligne actuelle
        # et que l'heure de sortie de la ligne suivant est supérieure ou égale
        # a l'heure d'arrivée + 2.5/60 de la ligne actuelle
        # ALORS la position suivante (la ligne suivante) est valide
        # POURQUOI CE 2.5/60
        if matriz.iloc[j+1]["cabezal"] != matriz.iloc[pos]["cabezal"] and matriz.iloc[j+1]["horarios_bloque"] >= matriz.iloc[pos]["hora_llegada"]+2.5/60:
            pos_siguiente = j+1
            return pos_siguiente
    return None

# función recomendada por la IA
def freduce(matriz, posiciones_quite):
    '''Esta función reduce la matriz conforme a los servicios asignados a buses anteriores.'''
    filas_filtradas = []

    for i in range(len(matriz)):
        if i not in posiciones_quite:
            filas_filtradas.append(matriz.iloc[i])

    if filas_filtradas:
        m_saldo = pd.concat(filas_filtradas, axis=1).T.reset_index(drop=True)
    else:
        m_saldo = pd.DataFrame(columns=matriz.columns)  # Devuelve un DataFrame vacío con las mismas columnas

    return m_saldo

# lista las posiciones que quedan por asignar
#    '''esta función "p" sirve para parear resultados de submatrices con matriz origen df_utilizada'''
def p(df_utilizada, posiciones_quite):
    lista_posiciones_quedan = []
    for i in range(len(df_utilizada)):
        lista_posiciones_quedan += [i]
    for j in posiciones_quite:
        lista_posiciones_quedan.remove(j)
    return lista_posiciones_quedan

#para cada servicio y a cada tipo de dia, se extrae la matrix y se aplica el codigo
if ASINT_HEADLESS:
    limite_expedicion = int(os.environ.get('ASINT_LIMITE_EXPEDICION', '1000'))
else:
    while True:
        try:
            limite_expedicion = int(input("Limite de expedicion por bus: "))
            break
        except ValueError:
            print("Paso debe ser un integer")

# nuevo código de la función reemplazando el append
def calculo_horarios(limite_expedicion=1000, umbral=None):
    actividades = []  # ← Acá vamos guardando todos los dicts

    for iservicio in df_result.servicio.unique():
        for idia in df_result.orden_dia.unique():
            df_utilizada = df_result[["horarios_bloque", "cabezal", "hora_llegada", "distancia", "velocidad"]][
                (df_result["servicio"] == iservicio) & (df_result["orden_dia"] == idia)
            ]
            m = df_utilizada
            trabajos = []

            while not m.empty:
                j = 0
                lista_poss = [j]

                if umbral is not None:
                    limite_expedicion = umbral[
                        (umbral["tipodia"] == idia) &
                        (umbral["nombre_servicio"] == nombre_servicio[iservicio])
                    ]["umbral"].values[0]

                while g(j, m) is not None and len(lista_poss) < limite_expedicion:
                    lista_poss.append(g(j, m))
                    j = g(j, m)

                m = freduce(m, lista_poss)
                trabajos.append(lista_poss)

            lista_quite = []
            trabajos_df_utilizada = []

            for i in range(len(trabajos)):
                lista_posiciones_quedan = p(df_utilizada, lista_quite)
                quite = [lista_posiciones_quedan[j] for j in trabajos[i]]
                lista_quite += quite
                trabajos_df_utilizada.append([lista_posiciones_quedan[k] for k in trabajos[i]])

            veh = [j + 1 for j in range(len(trabajos_df_utilizada))]

            for i in range(len(df_utilizada)):
                for j in range(len(trabajos_df_utilizada)):
                    for k in range(len(trabajos_df_utilizada[j])):
                        if i == trabajos_df_utilizada[j][k] and df_utilizada.iloc[i]["cabezal"] in [0, 1]:
                            actividad = {
                                "cabezal": df_utilizada.iloc[i]["cabezal"],
                                "horarios_bloque": df_utilizada.iloc[i]["horarios_bloque"],
                                "hora_llegada": df_utilizada.iloc[i]["hora_llegada"],
                                "distancia": df_utilizada.iloc[i]["distancia"],
                                "velocidad": df_utilizada.iloc[i]["velocidad"],
                                "posicion": i,
                                "vehiculo": veh[j],
                                "tipodia": idia,
                                "servicio": iservicio,
                                "nombre_servicio": nombre_servicio[iservicio]
                            }
                            actividades.append(actividad)

    # Convertimos la lista de diccionarios en un DataFrame
    horarios_buses_3dias = pd.DataFrame(actividades)
    return horarios_buses_3dias

# =============================================================================
# PRIMER CALCULO DE HORARIOS
horarios_buses_3dias = calculo_horarios(limite_expedicion)

ruta_archivo = ruta / 'horarios_buses_3dias.xlsx'
horarios_buses_3dias.to_excel(ruta_archivo, index = False)


# horarios_buses_3dias.to_excel('horarios_buses_3dias.xlsx', index = False)
# =============================================================================
#%% camellos
# matrix de 24 horas con un paso de x minutos
if ASINT_HEADLESS:
    paso = int(os.environ.get('ASINT_PASO_MINUTOS', '15'))
else:
    while True:
        try:
            paso = int(input("Paso de X minutos: "))
            break
        except ValueError:
            print("Paso debe ser un integer")
        
def interval_extract(list):
    list = sorted(set(list))
    range_start = list[0]
  
    for number in list[1:]:
        yield [range_start, number]
        range_start  = number
        
matrixXminutosDia = np.arange(0, 24, 24/1440*paso).tolist()
matrixXminutosIntervalDia = list(interval_extract(matrixXminutosDia))

# función que retorna True si hay intersección entre períodos, y retorna False si no 
def superposicion(per1, per2):
    # cada lista de período tiene 2 elementos: inicio contenido "[" y fin no contenido ")"
    # en este código, esta función se ocupa para ver si el período 2 alimenta conteo de intersecciones en período 1 
    if (per2["horarios_bloque"] < per1[1] and per2["hora_llegada"] > per1[0]):
        return True
    else:
        return False

camellos = pd.DataFrame()
camellos_no_resumidos = pd.DataFrame()

'''
path = os.getcwd() + '/camellos'
# Check whether the specified path exists or not
isExist = os.path.exists(path)
if not isExist:
  # Create a new directory because it does not exist 
  os.makedirs(path)
  print("The new directory is created!")
'''

path = _output_base / proceso / unidad_servicio_heurística / 'camellos'
path.mkdir(parents=True, exist_ok=True)  # Crea todos los niveles necesarios

# AGREGAR EL ATRIBUTO LÍNEA AL DF #horarios_buses_3días ################## BUEN OJO ##################################
for l in horarios_buses_3dias.nombre_servicio.unique(): # cambié "línea" por "nombre_servicio"
    for idia in df_result.orden_dia.unique():
        horarios_buses_3dias_servicio = horarios_buses_3dias[(horarios_buses_3dias["nombre_servicio"] == l) & (horarios_buses_3dias["tipodia"] == idia)]
        lista_cuenta = []
        for i in range(len(matrixXminutosIntervalDia)):
            cuenta = 0
            for j in range(len(horarios_buses_3dias_servicio)):
                if superposicion(matrixXminutosIntervalDia[i],horarios_buses_3dias_servicio.iloc[j]):
                    cuenta += 1
            lista_cuenta += [cuenta]
            
        camello = pd.DataFrame({
            "nombre_servicio" : l, 
            "tipodia" : idia, 
            "camello" : [lista_cuenta]
            })
        
        camello_no_resumido = pd.DataFrame({
            "nombre_servicio" : l, 
            "tipodia" : idia, 
            "camello" : lista_cuenta,
            "interval_horario" : matrixXminutosIntervalDia,
            "horario_inicio" : matrixXminutosDia[1:]
            })
        camellos = pd.concat([camellos, camello])
        camellos_no_resumidos = pd.concat([camellos_no_resumidos, camello_no_resumido])
        print("-----------------Línea : " + str(l )+ " Tipo dia : " + str(idia) + "-----------")
        print(lista_cuenta)
        
        plt.plot(camello_no_resumido["horario_inicio"].apply(str), camello_no_resumido["camello"])
        # plt.xticks(rotation=90)
        plt.xticks(np.arange(0, len(matrixXminutosDia) + 1, 10), rotation = 60)
        plt.title("Línea : " + str(l )+ " Tipo dia : " + str(idia))
        plt.savefig(path / ("s" + str(l) + "d" + str(idia) + ".png"))
        #plt.savefig(path+"/s" + str(l) + "d" + str(idia)+".png")
        if ASINT_HEADLESS:
            plt.close()
        else:
            plt.show()

camellos_no_resumidos["horario_inicio_3dias"] = camellos_no_resumidos["horario_inicio"] + camellos_no_resumidos["tipodia"] * 24

#PONER LOS SERVICIOS EN NUMÉRICO

nombre_servicio2 = df_líneas_heurística.set_index('línea')['ID_línea'].to_dict()
'''
nombre_servicio2 = {
        'A':0, 'B':1, 'B_lento':2, 'B_rápido':3}
'''
camellos_no_resumidos["num_servicio"] = camellos_no_resumidos['nombre_servicio'].map(nombre_servicio2)

ruta_archivo = path / 'camellos_no_resumidos.xlsx'
camellos_no_resumidos.to_excel(ruta_archivo, index = False)
# no aplica ... camellos_no_resumidos.to_excel(path + "/" + 'camellos_no_resumidos.xlsx', index = False)
