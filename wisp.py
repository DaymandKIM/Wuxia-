"""대나무 유령불 — 밝은 청록 실루엣이라 밝기로 잘라낸다."""
from PIL import Image
import numpy as np, json
from scipy import ndimage
SRC='sheets/wisp.png'
A=np.array(Image.open(SRC).convert('RGB')).astype(int)
S=468/936.0   # crop(0,170) 확대 2배 → 원본
def C(gx,gy,gw=270,gh=235):
    return (int(gx*S), 170+int(gy*S), int((gx+gw)*S), 170+int((gy+gh)*S))
CELLS = {
  'idle':  C(28, 30),
  'float': C(325,30),
  'atk':   C(622,30),
  'hit':   C(28, 385),
  'death': C(325,385),
}
def cut(box):
    x0,y0,x1,y1 = box
    sub = A[y0:y1, x0:x1]
    if sub.size == 0: return None
    # 유령불은 청록으로 밝게 빛난다. 배경(어두운 회청)과 밝기·색조로 갈린다.
    r,g,b = sub[:,:,0], sub[:,:,1], sub[:,:,2]
    lum = sub.mean(2)
    glow = (lum > 78) & (b > r + 12) & (g > r + 8)
    glow = ndimage.binary_closing(glow, np.ones((3,3)))
    if glow.sum() < 60: return None
    lb,n = ndimage.label(glow)
    sz = ndimage.sum(glow, lb, range(1,n+1))
    # 본체 + 가까운 불티까지 (본체 3% 이상)
    keep = set(i+1 for i,s in enumerate(sz) if s >= max(sz)*0.03)
    m = np.isin(lb, list(keep))
    m = ndimage.binary_fill_holes(m)
    ys,xs = np.where(m)
    rgb = sub[ys.min():ys.max()+1, xs.min():xs.max()+1]
    msk = m[ys.min():ys.max()+1, xs.min():xs.max()+1]
    return Image.fromarray(np.dstack([rgb.astype(np.uint8),(msk*255).astype(np.uint8)]),'RGBA')
raw={}
for k,box in CELLS.items():
    im = cut(box)
    if im: raw[k]=im; print("  %-6s %dx%d"%(k,im.width,im.height))
    else:  print("  %-6s 없음"%k)
# 강도보다 작게 — 떠다니는 불이니
TARGET=34
mh = max(i.height for i in raw.values()); sc = TARGET/mh
W = int(np.ceil(max(i.width for i in raw.values())*sc))+4
H = int(np.ceil(mh*sc))+3
for k,im in raw.items():
    w2=max(2,round(im.width*sc)); h2=max(2,round(im.height*sc))
    mid=im.resize((w2*2,h2*2),Image.LANCZOS)
    r=mid.resize((w2,h2),Image.LANCZOS)
    a=np.array(r); a[:,:,3]=np.where(a[:,:,3]>105,255,0)
    out=Image.new('RGBA',(W,H),(0,0,0,0))
    out.alpha_composite(Image.fromarray(a,'RGBA'),((W-w2)//2, H-2-h2))
    # 색 정리
    arr=np.array(out); al=arr[:,:,3]
    q=Image.fromarray(arr[:,:,:3],'RGB').quantize(colors=24,method=Image.MEDIANCUT).convert('RGB')
    Image.fromarray(np.dstack([np.array(q),al]),'RGBA').save('assets/wisp_%s.png'%k)
print("규격 %dx%d"%(W,H))
json.dump({'w':W,'h':H,'frames':sorted(raw.keys())},open('wispmeta.json','w'),ensure_ascii=False,indent=1)
