import sys
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

# Let's inspect skimage / scipy for contour finding
try:
    from skimage import measure
    print("skimage.measure is available!")
except ImportError:
    print("skimage not installed, checking cv2 or scipy")
    try:
        import cv2
        print("cv2 is available!")
    except ImportError:
        print("cv2 not installed")
