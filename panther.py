"""흑표범 — 걷기 4 + 공격 4 = 8프레임.
   걷기 시트는 마젠타 배경, 공격 시트는 회청 박스 안에 있다."""
from PIL import Image
import numpy as np, json
from scipy import ndimage

def cut(A, x0, x1, y0=0, y1=None, usebox=True):
    """영역에서 표범만 뽑는다. usebox=False면 마젠타만 배경으로 본다."""
    if y1 is None: y1 = A.shape[0]
    sub = A[y0:y1, x0:x1].astype(int)
    r,g,b = sub[:,:,0], sub[:,:,1], sub[:,:,2]
    lum = sub.mean(2)
    mag = (r>90)&(b>90)&(r-g>40)&(b-g>40)                    # 마젠타
    bg = mag
    if usebox:
        # 회청 박스 — 표범 몸(더 어둡다)과 구분되게 밝기 하한을 올린다
        bg = bg | ((np.abs(r-g)<30)&(np.abs(g-b)<30)&(lum>52)&(lum<120)&(b>=r-6))
    fg = ndimage.binary_opening(~bg, np.ones((3,3)))
    if fg.sum() < 2000: return None
    lb,n = ndimage.label(fg, structure=np.ones((3,3)))
    sz = ndimage.sum(fg, lb, range(1,n+1))
    m = ndimage.binary_fill_holes(lb == int(np.argmax(sz))+1)
    if m.sum() < 2000: return None
    ys,xs = np.where(m)
    rgb = sub[ys.min():ys.max()+1, xs.min():xs.max()+1]
    msk = m[ys.min():ys.max()+1, xs.min():xs.max()+1]
    return Image.fromarray(np.dstack([rgb.astype(np.uint8),(msk*255).astype(np.uint8)]),'RGBA')

raw={}
# 걷기 — 마젠타 시트, 칸 좌표 실측
Aw = np.array(Image.open('sheets/panther_idle.png').convert('RGB'))
WBOX = [(109,661),(724,1283),(1342,1902),(1964,2516)]
for i,(x0,x1) in enumerate(WBOX):
    im = cut(Aw, x0, x1, 530, 1000, usebox=False)   # 마젠타만 배경
    if im: raw['walk%d'%i]=im

# 공격 — 회청 박스 4칸 (실측 좌표)
Aa = np.array(Image.open('sheets/panther_atk.png').convert('RGB'))
AW = Aa.shape[1]
BOX = [(60, 990), (1090, 2000), (2090, 3000), (3090, 4080)]
for i,(x0,x1) in enumerate(BOX):
    im = cut(Aa, x0, min(x1, AW))
    if im: raw['atk%d'%i]=im

for k in sorted(raw): print("  %-6s %dx%d"%(k,raw[k].width,raw[k].height))

# 걷기와 공격은 원본 해상도가 다르다. 몸 '길이'를 기준으로 맞춘다.
TARGET_W = 78                       # 화면에 그려질 몸 길이
scale = {}
for k,im in raw.items():
    scale[k] = TARGET_W / im.width
# 캔버스는 가장 큰 프레임에 맞춘다
W = int(np.ceil(max(im.width*scale[k] for k,im in raw.items())))+4
H = int(np.ceil(max(im.height*scale[k] for k,im in raw.items())))+3
for k,im in raw.items():
    sc = scale[k]
    w2=max(2,round(im.width*sc)); h2=max(2,round(im.height*sc))
    mid=im.resize((w2*2,h2*2),Image.LANCZOS)
    r2=mid.resize((w2,h2),Image.LANCZOS)
    a=np.array(r2); a[:,:,3]=np.where(a[:,:,3]>110,255,0)
    rr,gg,bb=a[:,:,0].astype(int),a[:,:,1].astype(int),a[:,:,2].astype(int)
    a[:,:,3][(a[:,:,3]>0)&(rr>70)&(bb>70)&(rr-gg>28)&(bb-gg>28)]=0
    mm=a[:,:,3]>0
    if mm.any():
        lb2,c2=ndimage.label(mm)
        if c2>1:
            sz2=ndimage.sum(mm,lb2,range(1,c2+1))
            keep=set(i+1 for i,v in enumerate(sz2) if v>=max(sz2)*0.15)
            a[:,:,3][~np.isin(lb2,list(keep))]=0
    out=Image.new('RGBA',(W,H),(0,0,0,0))
    out.alpha_composite(Image.fromarray(a,'RGBA'),((W-w2)//2, H-2-h2))
    arr=np.array(out)
    q=Image.fromarray(arr[:,:,:3],'RGB').quantize(colors=28,method=Image.MEDIANCUT).convert('RGB')
    Image.fromarray(np.dstack([np.array(q),arr[:,:,3]]),'RGBA').save('assets/panther_%s.png'%k)
print("규격 %dx%d · %d프레임"%(W,H,len(raw)))
json.dump({'w':W,'h':H,'frames':sorted(raw.keys())},open('panthermeta.json','w'),ensure_ascii=False,indent=1)
