import urllib.request
import re

url = 'https://pin.it/3VpUAJo6s'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        match = re.search(r'<meta property=\"og:image\" content=\"(.*?)\"', html)
        if match:
            img_url = match.group(1)
            print(f'IMG_URL: {img_url}')
            urllib.request.urlretrieve(img_url, 'frame2.jpg')
            print('Downloaded to frame2.jpg')
        else:
            print('Not found')
except Exception as e:
    print(e)
