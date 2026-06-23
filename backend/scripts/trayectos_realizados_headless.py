"""Generación headless de gráficos de trayectorias de buses.
Adaptado de Trayectos realizados/Codigo/topología_OP_icfTXT_v2.py para ejecución web.
"""
import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path

ASINT_HEADLESS = bool(os.environ.get('ASINT_HEADLESS'))
if ASINT_HEADLESS:
    import matplotlib
    matplotlib.use('Agg')

def main():
    if ASINT_HEADLESS:
        expediciones_file = os.environ.get('ASINT_EXPEDICIONES_FILE')
        buses_file = os.environ.get('ASINT_BUSES_FILE')
        output_dir = os.environ.get('ASINT_OUTPUT_DIR')
        dia_filtro = os.environ.get('ASINT_DIA')  # Opcional: filtra a 1 día específico (YYYY-MM-DD)

        if not expediciones_file or not buses_file or not output_dir:
            raise RuntimeError('ASINT_EXPEDICIONES_FILE, ASINT_BUSES_FILE y ASINT_OUTPUT_DIR deben estar definidos.')

        # Crear output dir
        Path(output_dir).mkdir(parents=True, exist_ok=True)
    else:
        # Modo interactivo (no implementado para esta versión)
        raise NotImplementedError("Modo interactivo no soportado para trayectos_realizados")

    print("[TRAYECTOS] Leyendo archivos...")

    # Leer expediciones TXT
    df1 = pd.read_csv(expediciones_file, delimiter=';', header=None)

    # Mapear columnas
    list_campos = [
        'Registro_ID', 'Rut_Operador_Transporte', 'Rut_Operador_Gps', 'Mes_Informacion',
        'Servicio_ID', 'Nombre_Servicio', 'Sentido', 'PPU', 'Expedicion_ID',
        'Inicio_Expedicion_Chile', 'Inicio_Expedicion_Greenwich', 'Correlativo_Punto_Control',
        'Latitud_Punto_Control', 'Longitud_Punto_Control', 'Velocidad_Punto_Control',
        'FHora_Chile_Pasada_PtoCtrol', 'Fhora_Greew_Pasada_PtoCtrol', 'Periodo_ID',
        'Valida', 'Distancia_Recorrida'
    ]

    # Ajustar columnas según número de campos en el archivo
    if len(df1.columns) >= len(list_campos):
        df1 = df1.iloc[:, :len(list_campos)]
        df1.columns = list_campos
    else:
        df1.columns = list_campos[:len(df1.columns)]

    # Procesar coordenadas
    df1['Longitud_Punto_Control'] = pd.to_numeric(
        df1['Longitud_Punto_Control'].astype(str).str.replace(',', '.'), errors='coerce'
    )
    df1['Latitud_Punto_Control'] = pd.to_numeric(
        df1['Latitud_Punto_Control'].astype(str).str.replace(',', '.'), errors='coerce'
    )

    # Crear columna servicio_sentido
    df1['servicio_sentido'] = df1['Nombre_Servicio'].astype(str) + '_' + df1['Sentido'].astype(str)

    # Leer mapeo de buses desde Excel
    print("[TRAYECTOS] Leyendo mapeo de buses...")
    try:
        df_dicc_buses = pd.read_excel(buses_file, sheet_name=['ordenBus', 'ordenPPU'], engine='openpyxl')
        df_buses_ordenBus = df_dicc_buses['ordenBus'].copy()
        if 'NúmeroBusString' in df_buses_ordenBus.columns:
            df_buses_ordenBus = df_buses_ordenBus.drop(columns=['NúmeroBusString'])
        dicc_buses = df_buses_ordenBus.set_index('PPU')['NúmeroBus'].to_dict()
        df1['NúmeroBus'] = df1['PPU'].map(dicc_buses)
    except Exception as e:
        print(f"[TRAYECTOS] Advertencia: no se pudo leer mapeo de buses: {e}")
        df1['NúmeroBus'] = df1['PPU']  # Fallback: usar PPU como bus number

    # Procesar fechas
    df1['Inicio_Expedicion_Chile'] = pd.to_datetime(
        df1['Inicio_Expedicion_Chile'], format='%d/%m/%Y %H:%M:%S', errors='coerce'
    )
    df1['Día'] = df1['Inicio_Expedicion_Chile'].dt.date
    df1['Hora_Inicio'] = df1['Inicio_Expedicion_Chile'].dt.strftime('%H:%M:%S')

    # Filtrar por día si se proporciona
    if dia_filtro:
        df1 = df1[df1['Día'].astype(str) == dia_filtro]
        if df1.empty:
            print(f"[TRAYECTOS] Sin datos para el día {dia_filtro}")
            return

    # Obtener lista de buses
    buses_lista = df1['NúmeroBus'].dropna().unique()
    buses_lista = np.sort(buses_lista)
    buses_lista = buses_lista.astype(str)

    print(f"[TRAYECTOS] Generando gráficos para {len(buses_lista)} buses...")

    # Crear carpetas por bus
    for nombre_bus in buses_lista:
        ruta_carpeta = os.path.join(output_dir, nombre_bus)
        Path(ruta_carpeta).mkdir(parents=True, exist_ok=True)

    buses_lista_num = pd.to_numeric(buses_lista, errors='coerce')

    # Generar gráficos
    grafico_index = 0
    for j, numero_bus in enumerate(buses_lista_num):
        df_bus = df1[df1['NúmeroBus'] == numero_bus]

        # Obtener expediciones únicas por día
        filtro_expedicion_bus = df_bus[['Expedicion_ID', 'Día', 'Valida', 'NúmeroBus', 'servicio_sentido', 'Hora_Inicio']].drop_duplicates()
        filtro_expedicion_bus = filtro_expedicion_bus.reset_index(drop=True)

        for i, row in filtro_expedicion_bus.iterrows():
            expedicion_id = row['Expedicion_ID']
            df_exped = df_bus[df_bus['Expedicion_ID'] == expedicion_id]

            if df_exped.empty or df_exped[['Latitud_Punto_Control', 'Longitud_Punto_Control']].isna().all().any():
                continue

            # Extraer coordenadas
            coords = df_exped[['Longitud_Punto_Control', 'Latitud_Punto_Control']].dropna().values
            if len(coords) < 2:
                continue

            x = coords[:, 0]
            y = coords[:, 1]

            # Crear gráfico
            try:
                plt.figure(figsize=(8, 6))
                plt.scatter(x, y, color='red', marker='o', label='Puntos')
                plt.plot(x, y, color='blue', linestyle='-', linewidth=2, label='Trayectoria')

                for k in range(len(x) - 1):
                    plt.arrow(x[k], y[k], x[k + 1] - x[k], y[k + 1] - y[k],
                              shape='full', lw=0, length_includes_head=True, head_width=0.005, color='red')

                dia_str = str(row['Día'])
                valida = row['Valida']
                servicio_sentido = row['servicio_sentido']
                hora_inicio = row['Hora_Inicio']

                plt.xlabel("Longitud X")
                plt.ylabel("Latitud Y")
                plt.title(f"Bus {numero_bus}, Exped {expedicion_id}, {dia_str}, Válida: {valida}, {servicio_sentido}, {hora_inicio}")
                plt.legend()
                plt.grid()

                # Guardar
                output_path = os.path.join(output_dir, str(int(numero_bus)), f"grafico{grafico_index}.png")
                plt.savefig(output_path, format="png", dpi=100)
                plt.close()

                grafico_index += 1
            except Exception as e:
                print(f"[TRAYECTOS] Error al generar gráfico {grafico_index}: {e}")
                plt.close()

        if (j + 1) % 5 == 0:
            print(f"[TRAYECTOS] Bus {j + 1}/{len(buses_lista_num)} procesado")

    print(f"[TRAYECTOS] Proceso finalizado. {grafico_index} gráficos generados en: {output_dir}")

if __name__ == "__main__":
    main()
