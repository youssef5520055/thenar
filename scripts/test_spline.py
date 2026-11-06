import sys
import numpy as np
import cv2
from scipy.interpolate import splprep, splev

sys.stdout.reconfigure(encoding="utf-8")

# Let's test splprep on a contour
cnt = np.array([[10, 10], [10, 50], [40, 50], [40, 40], [20, 40], [20, 10]], dtype=float)
pts = cnt.T
tck, u = splprep(pts, s=2.0, per=True, k=3)
u_new = np.linspace(0, 1, 50)
x_new, y_new = splev(u_new, tck)
print("Spline fitting successful! Number of interpolated points:", len(x_new))
