"""대나무 마왕 — 마젠타 시트 전체.
   행0: 대기5 + 포효4        행1: 대형공격5 + 에너지폭발5        행2: 사망4
"""
from PIL import Image
import numpy as np, json
from scipy import ndimage
SRC='sheets/demon.png'
A=np.array(Image.open(SRC).convert('RGB'))
# 배경 판정: 마젠타는 R·B가 높고 G가 낮다. 보라빛 몸통은 G가 더 있다.
r_,g_,b_ = A[:,:,0].astype(int), A[:,:,1].astype(int), A[:,:,2].astype(int)
mag = (r_>150) & (b_>150) & (g_<70) & (r_-g_>110) & (b_-g_>110)
# 박스 테두리는 '검고 곧은 선'이다. 얼굴의 어두운 부분과 구별하려면
# 밝기만으로는 안 되고, 마젠타에 둘러싸였는지를 본다.
lum_ = A.mean(2)
dark_ = lum_ < 34
# 마젠타를 넓게 부풀린 뒤, 그 안에 든 어두운 픽셀만 테두리로 본다
magw = ndimage.binary_dilation(mag, np.ones((7,7)))
mag = mag | (dark_ & magw)
fg=ndimage.binary_opening(~mag,np.ones((3,3)))
lbl,n=ndimage.label(fg,structure=np.ones((3,3)))

# (이름, y범위, x시작점들) — 실측
GROUPS = [
  ('idle',  (110, 500), [46, 382, 719, 1056, 1392]),          # 대기 5
  ('roar',  (110, 500), [1804, 2139, 2778, 3118]),            # 포효 4
  ('swing', (500, 890), [46, 382, 720, 1032, 1393]),          # 대형 공격 5
  ('burst', (500, 890), [1804, 2123, 2447, 2760, 3119]),      # 에너지 폭발 5
  ('death', (890, 1216),[1056, 1412, 1786, 2121]),            # 사망 4
]
CW = 310
def pick(y0, y1, x0):
    x1 = x0 + CW
    reg = lbl[y0:y1, x0:x1]
    ids, cnt = np.unique(reg[reg>0], return_counts=True)
    best=None; bs=0
    for i,c in zip(ids,cnt):
        if c < 4000: continue
        if c < (lbl==i).sum()*0.45: continue
        if c > bs: bs=c; best=i
    if best is None: return None
    m = (lbl==best)
    keep = np.zeros_like(m); keep[y0:y1, x0:x1] = True
    m = m & keep
    m = ndimage.binary_opening(m, np.ones((3,3)))
    l2,c2 = ndimage.label(m)
    if c2 > 1:
        sz = ndimage.sum(m, l2, range(1,c2+1))
        m = (l2 == int(np.argmax(sz))+1)
    m = ndimage.binary_fill_holes(m)
    ys,xs = np.where(m)
    if len(ys) < 800: return None
    rgb = A[ys.min():ys.max()+1, xs.min():xs.max()+1]
    msk = m[ys.min():ys.max()+1, xs.min():xs.max()+1]
    return Image.fromarray(np.dstack([rgb,(msk*255).astype(np.uint8)]),'RGBA')
raw={}
for name,(y0,y1),xs in GROUPS:
    got=0
    for i,x0 in enumerate(xs):
        im = pick(y0,y1,x0)
        if im: raw['%s%d'%(name,i)] = im; got+=1
    print("  %-6s %d/%d"%(name,got,len(xs)))
# 주인공(몸높이 48)의 2.2배
TARGET=106
mh = max(i.height for i in raw.values()); sc = TARGET/mh
W = int(np.ceil(max(i.width for i in raw.values())*sc))+4
H = int(np.ceil(mh*sc))+3
for k,im in raw.items():
    w2=max(2,round(im.width*sc)); h2=max(2,round(im.height*sc))
    mid=im.resize((w2*2,h2*2),Image.LANCZOS)
    r=mid.resize((w2,h2),Image.LANCZOS)
    a=np.array(r); a[:,:,3]=np.where(a[:,:,3]>110,255,0)
    rr,gg,bb=a[:,:,0].astype(int),a[:,:,1].astype(int),a[:,:,2].astype(int)
    a[:,:,3][(a[:,:,3]>0)&(rr>150)&(bb>150)&(gg<70)&(rr-gg>110)&(bb-gg>110)]=0
    out=Image.new('RGBA',(W,H),(0,0,0,0))
    out.alpha_composite(Image.fromarray(a,'RGBA'),((W-w2)//2, H-2-h2))
    arr=np.array(out); al=arr[:,:,3]
    q=Image.fromarray(arr[:,:,:3],'RGB').quantize(colors=44,method=Image.MEDIANCUT).convert('RGB')
    Image.fromarray(np.dstack([np.array(q),al]),'RGBA').save('assets/demon_%s.png'%k)
print("규격 %dx%d · %d프레임"%(W,H,len(raw)))
json.dump({'w':W,'h':H,'frames':sorted(raw.keys())},open('bossmeta.json','w'),ensure_ascii=False,indent=1)
