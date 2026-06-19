from PIL import Image
import collections

img = Image.open('frame6.png').convert("RGB")
data = list(img.getdata())
counter = collections.Counter(data)
for color, count in counter.most_common(10):
    print(color, count)
