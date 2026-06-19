import requests
from bs4 import BeautifulSoup
import sys

urls = sys.argv[1:]
for url in urls:
    try:
        r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=10)
        soup = BeautifulSoup(r.text, 'html.parser')
        og_img = soup.find('meta', property='og:image')
        if og_img:
            print(f"{url} -> {og_img['content']}")
        else:
            print(f"{url} -> Not found")
    except Exception as e:
        print(f"{url} -> Error: {e}")
