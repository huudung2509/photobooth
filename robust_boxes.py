import cv2
import numpy as np
import json

def process_image(filename, is_black_boxes):
    img = cv2.imread(filename)
    if img is None: return []
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    if is_black_boxes:
        # Threshold for black (pixels < 30 become 255 (white), else 0)
        _, thresh = cv2.threshold(gray, 30, 255, cv2.THRESH_BINARY_INV)
    else:
        # Threshold for white (pixels > 240 become 255, else 0)
        _, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY)
        
    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    boxes = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        # Filter by size
        if w > 100 and h > 100:
            boxes.append({'x': x, 'y': y, 'w': w, 'h': h})
            
    # Make transparent in original image
    # Add alpha channel if not present
    b_channel, g_channel, r_channel = cv2.split(img)
    alpha_channel = np.ones(b_channel.shape, dtype=b_channel.dtype) * 255
    
    for box in boxes:
        x, y, w, h = box['x'], box['y'], box['w'], box['h']
        alpha_channel[y:y+h, x:x+w] = 0
        
    img_RGBA = cv2.merge((b_channel, g_channel, r_channel, alpha_channel))
    cv2.imwrite(filename, img_RGBA)
    
    return sorted(boxes, key=lambda b: (b['y'], b['x']))

res = {}
res['frame7.png'] = process_image('frame7.png', is_black_boxes=False)
res['frame8.png'] = process_image('frame8.png', is_black_boxes=True)
res['frame9.png'] = process_image('frame9.png', is_black_boxes=False)

print(json.dumps(res, indent=2))
