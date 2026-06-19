from PIL import Image

img = Image.open('frame2.jpg').convert('L')
width, height = img.size
# resize maintaining aspect ratio
new_width = 80
new_height = int(new_width * height / width)
img = img.resize((new_width, new_height))
chars = " .:-=+*#%@"
pixels = img.getdata()
new_pixels = [chars[pixel//26] for pixel in pixels]
new_pixels = ''.join(new_pixels)
for i in range(0, len(new_pixels), new_width):
    print(new_pixels[i:i+new_width])
