import cv2
import numpy as np
import pandas as pd
from ultralytics import YOLO

# ==========================================
# CONFIGURACIÓN DEL SCRIPT
# ==========================================
VIDEO_ENTRADA = "mago.mp4"       # Coloca tu video de prueba en la misma carpeta
VIDEO_SALIDA = "video_procesado.mp4"     # Nombre del video con las cajas dibujadas
ARCHIVO_CSV = "coordenadas_jugadores.csv" # Archivo final con los datos en metros

# 1. Puntos de origen en el video (Píxeles)
# Debes abrir un frame de tu video en Paint/Photoshop y anotar las coordenadas (x,y) de 4 puntos clave de la cancha
# Ejemplo: Las 4 esquinas de una mitad de cancha, o de un área grande.
# Orden sugerido: Arriba-Izq, Arriba-Der, Abajo-Der, Abajo-Izq
puntos_pixeles = np.array([
    [200, 150],  # Arriba Izquierda (Ej: esquina superior izquierda del área)
    [1080, 150], # Arriba Derecha (Ej: esquina superior derecha del área)
    [1200, 600], # Abajo Derecha (Ej: esquina inferior derecha del área)
    [80, 600]    # Abajo Izquierda (Ej: esquina inferior izquierda del área)
], dtype=np.float32)

# 2. Puntos de destino en la vida real (Metros)
# Estos deben corresponder EXACTAMENTE a los mismos puntos de arriba, pero en medidas reales.
# Imagina un plano donde el punto superior izquierdo de tu polígono es la coordenada (0,0)
puntos_metros = np.array([
    [0, 0],       # Arriba Izquierda real
    [40, 0],      # Arriba Derecha real (Ej: el área mide 40m de ancho)
    [40, 16.5],   # Abajo Derecha real (Ej: el área mide 16.5m de largo)
    [0, 16.5]     # Abajo Izquierda real
], dtype=np.float32)

# Calcular la Matriz de Homografía usando OpenCV (KAN-S10-02)
# Esta matriz es el "traductor" mágico de píxeles a metros
matriz_homografia, _ = cv2.findHomography(puntos_pixeles, puntos_metros)


def pixel_a_metro(x, y, matriz):
    """Aplica la matriz de homografía a un solo punto (x,y)."""
    punto_px = np.array([[[x, y]]], dtype=np.float32)
    punto_m = cv2.perspectiveTransform(punto_px, matriz)
    return punto_m[0][0][0], punto_m[0][0][1]


def ejecutar_pipeline():
    print("Iniciando motor de visión... (KAN-S10-03 y KAN-S10-04)")
    
    # Cargar modelo ligero pre-entrenado (descargará yolov8n.pt automáticamente si no existe)
    modelo = YOLO("yolov8n.pt")
    
    cap = cv2.VideoCapture(VIDEO_ENTRADA)
    if not cap.isOpened():
        print(f"ERROR: No se pudo abrir el video {VIDEO_ENTRADA}. ¿Está en la carpeta Procesamiento?")
        return

    # Preparar el video de salida para visualización
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(VIDEO_SALIDA, fourcc, fps, (width, height))

    datos_tracking = []
    frame_idx = 0

    print("Procesando frames... Esto tomará un momento.")
    
    # Procesar el video con tracking activado (usando ByteTrack por defecto en Ultralytics)
    # classes=[0] asegura que SOLO detecte personas (ignora autos, pelotas, etc por ahora)
    resultados = modelo.track(source=VIDEO_ENTRADA, stream=True, classes=[0], tracker="bytetrack.yaml", verbose=False)

    for r in resultados:
        frame = r.orig_img
        
        # Si el modelo detectó cajas y les asignó un ID
        if r.boxes is not None and r.boxes.id is not None:
            cajas = r.boxes.xyxy.cpu().numpy() # [x1, y1, x2, y2]
            ids = r.boxes.id.cpu().numpy().astype(int)
            
            for caja, track_id in zip(cajas, ids):
                x1, y1, x2, y2 = caja
                
                # Calcular el centro de los pies del jugador (punto de contacto con la cancha)
                x_pies = (x1 + x2) / 2
                y_pies = y2
                
                # Convertir la posición de pantalla a metros reales!
                x_real, y_real = pixel_a_metro(x_pies, y_pies, matriz_homografia)
                
                # Guardar el registro
                datos_tracking.append({
                    "frame": frame_idx,
                    "tiempo_seg": frame_idx / fps,
                    "track_id": track_id,
                    "x_pixel": round(x_pies, 2),
                    "y_pixel": round(y_pies, 2),
                    "x_metro": round(x_real, 2),
                    "y_metro": round(y_real, 2)
                })
                
                # Dibujar en el video para depurar
                cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                cv2.circle(frame, (int(x_pies), int(y_pies)), 5, (0, 0, 255), -1)
                cv2.putText(frame, f"ID: {track_id}", (int(x1), int(y1)-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        # Opcional: Dibujar el polígono de calibración para verificar que esté bien puesto
        cv2.polylines(frame, [np.int32(puntos_pixeles)], True, (255, 0, 0), 2)

        out.write(frame)
        frame_idx += 1

    cap.release()
    out.release()
    
    # Exportar resultados a CSV
    if datos_tracking:
        df = pd.DataFrame(datos_tracking)
        df.to_csv(ARCHIVO_CSV, index=False)
        print(f"\n¡Éxito! Procesamiento terminado.")
        print(f"Se exportaron {len(df)} registros a {ARCHIVO_CSV}")
        print(f"Video con anotaciones guardado como {VIDEO_SALIDA}")
    else:
        print("\nEl procesamiento terminó, pero no se guardaron datos. Revisa si el modelo detectó algo.")

if __name__ == "__main__":
    ejecutar_pipeline()