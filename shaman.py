"""대나무 샤먼 — 기본 5동작(어두운 박스) + 마법 4동작(마젠타)."""
from PIL import Image
import numpy as np, json
from scipy import ndimage
from collections import Counter

def pick(sub, bgmode):
    """영역에서 인물만 뽑는다."""
    r,g,b = sub[:,:,0], sub[:,:,1], sub[:,:,2]
    lum = sub.mean(2)
    if bgmode == 'mag':
        bg = (r>120)&(b>120)&(r-g>40)&(b-g>40)
        # 보라 박스 배경도
        bg = bg | ((r>70)&(b>70)&(g<70)&(r-g>25)&(b-g>25))
    else:
        # 박스 배경 두 색(#282C35 안쪽, #343D46 테두리)만 배경으로 본다
        bg = np.zeros(sub.shape[:2], bool)
        for c in ((0x28,0x2C,0x35), (0x34,0x3D,0x46), (0x22,0x26,0x2E)):
            bg |= (np.abs(sub - np.array(c)).max(2) < 13)
    fg = ndimage.binary_opening(~bg, np.ones((3,3)))
    if fg.sum() < 900: return None
    lb,n = ndimage.label(fg, structure=np.ones((3,3)))
    sz = ndimage.sum(fg, lb, range(1,n+1))
    keep = set(i+1 for i,s in enumerate(sz) if s >= max(sz)*0.05)
    m = ndimage.binary_fill_holes(np.isin(lb, list(keep)))
    ys,xs = np.where(m)
    if len(ys) < 400: return None
    rgb = sub[ys.min():ys.max()+1, xs.min():xs.max()+1]
    msk = m[ys.min():ys.max()+1, xs.min():xs.max()+1]
    return Image.fromarray(np.dstack([rgb.astype(np.uint8),(msk*255).astype(np.uint8)]),'RGBA')

raw = {}
# 기본 5동작 — crop(0,40) 확대 1.5배 기준 좌표를 원본으로
A = np.array(Image.open('sheets/shaman_basic.png').convert('RGB')).astype(int)
# 5칸 — 박스 사이 여백을 기준으로 잰 좌표
# 인물 덩어리를 실측해 여백 8px씩 두고 자른다
BASE = [('idle',3,89,299,378),('walk',316,96,258,372),('run',599,106,306,355),
        ('atk',924,82,313,385),('cast',1295,94,454,371)]
PAD = 8
for name,bx,by,bw,bh in BASE:
    y0,y1 = max(0,by-PAD), min(A.shape[0], by+bh+PAD)
    x0,x1 = max(0,bx-PAD), min(A.shape[1], bx+bw+PAD)
    im = pick(A[y0:y1, x0:x1], 'box')
    if im: raw[name] = im

# 마법 4동작 — 마젠타 시트
B = np.array(Image.open('sheets/shaman_magic.png').convert('RGB')).astype(int)
# 인물 위치를 실측해 여백을 두고 자른다. 가운데 둘은 붙어 있어 경계로 나눈다.
MAG = [('m0',  40, 110, 800, 850),
       ('m1', 870,  66, 800, 936),
       ('m2',1690,  66, 780, 936),
       ('m3',2708, 110, 765, 840)]
PADM = 10
for name,bx,by,bw,bh in MAG:
    y0,y1 = max(0,by-PADM), min(B.shape[0], by+bh+PADM)
    x0,x1 = max(0,bx-PADM), min(B.shape[1], bx+bw+PADM)
    im = pick(B[y0:y1, x0:x1], 'mag')
    if im: raw[name] = im

for k in sorted(raw): print("  %-5s %dx%d"%(k,raw[k].width,raw[k].height))

# 강도(56×51)와 비슷하게
# 두 시트의 해상도가 달라 프레임마다 배율을 따로 잡는다
TARGET = 52
scale = {k: TARGET/im.height for k,im in raw.items()}
W = int(np.ceil(max(im.width*scale[k] for k,im in raw.items())))+4
H = int(np.ceil(max(im.height*scale[k] for k,im in raw.items())))+3
for k,im in raw.items():
    sc = scale[k]
    w2=max(2,round(im.width*sc)); h2=max(2,round(im.height*sc))
    mid=im.resize((w2*2,h2*2),Image.LANCZOS)
    r2=mid.resize((w2,h2),Image.LANCZOS)
    a=np.array(r2); a[:,:,3]=np.where(a[:,:,3]>110,255,0)
    rr,gg,bb=a[:,:,0].astype(int),a[:,:,1].astype(int),a[:,:,2].astype(int)
    a[:,:,3][(a[:,:,3]>0)&(rr>90)&(bb>90)&(rr-gg>30)&(bb-gg>30)]=0   # 마젠타 잔여물
    mm=a[:,:,3]>0
    if mm.any():
        lb2,c2=ndimage.label(mm)
        if c2>1:
            sz2=ndimage.sum(mm,lb2,range(1,c2+1))
            keep=set(i+1 for i,v in enumerate(sz2) if v>=max(sz2)*0.08)
            a[:,:,3][~np.isin(lb2,list(keep))]=0
    out=Image.new('RGBA',(W,H),(0,0,0,0))
    out.alpha_composite(Image.fromarray(a,'RGBA'),((W-w2)//2, H-2-h2))
    arr=np.array(out)
    q=Image.fromarray(arr[:,:,:3],'RGB').quantize(colors=32,method=Image.MEDIANCUT).convert('RGB')
    Image.fromarray(np.dstack([np.array(q),arr[:,:,3]]),'RGBA').save('assets/shaman_%s.png'%k)
print("규격 %dx%d · %d프레임"%(W,H,len(raw)))
json.dump({'w':W,'h':H,'frames':sorted(raw.keys())},open('shamanmeta.json','w'),ensure_ascii=False,indent=1)
