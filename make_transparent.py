from PIL import Image

def make_transparent(infile, outfile, threshold):
    img = Image.open(infile).convert("RGBA")
    data = img.load()
    w, h = img.size
    
    # We want to keep the rounded corners looking nice, but since they are drawn manually
    # we can just use a color threshold. However, anti-aliasing pixels might be left behind.
    # A better way is to check if a pixel is close to the background color AND it's not
    # something else.
    # Actually, if we just draw the photos UNDER the frame, we need the frame to have transparent holes.
    
    for y in range(h):
        for x in range(w):
            r, g, b, a = data[x, y]
            if r < threshold and g < threshold and b < threshold:
                data[x, y] = (r, g, b, 0)
    
    img.save(outfile, "PNG")

make_transparent("frame4.png", "frame4.png", 20)
make_transparent("frame5.png", "frame5.png", 20)
make_transparent("frame6.png", "frame6.png", 55)
