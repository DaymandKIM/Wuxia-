"""대나무숲 강도 — 마젠타 배경 시트에서 뽑는다. 박스는 무시하고 그림 기준."""
from PIL import Image
import numpy as np, json
from scipy import ndimage
SRC='sheets/bandit.png'
A=np.array(Image.open(SRC).convert('RGB'))
H,W,_=A.shape
mag=(A[:,:,0]>180)&(A[:,:,2]>180)&(A[:,:,1]<120)
# 박스 테두리(어두운 자주선)도 배경으로 본다
r,g,b=A[:,:,0].astype(int),A[:,:,1].astype(int),A[:,:,2].astype(int)
border=(r>60)&(r<150)&(b>60)&(b<150)&(g<70)
bg = mag | border
fg = ndimage.binary_opening(~bg, np.ones((3,3)))
lbl,n = ndimage.label(fg, structure=np.ones((3,3)))

# 4행 × 3열 영역 (글자 줄은 제외)
ROWS=[(60,268),(292,505),(520,735),(750,960)]
COLS=[(10,290),(290,570),(570,854)]
def pick(y0,y1,x0,x1):
    """영역 안에서 가장 큰 덩어리(=인물)를 뽑는다"""
    reg = lbl[y0:y1, x0:x1]
    ids,cnt = np.unique(reg[reg>0], return_counts=True)
    if len(ids)==0: return None
    # 영역 안에 대부분이 들어있는 큰 덩어리만
    best=None; bs=0
    for i,c in zip(ids,cnt):
        total=(lbl==i).sum()
        if c < total*0.40: continue      # 영역 밖으로 크게 삐져나가면 다른 칸 것
        if c>bs: bs=c; best=i
    if best is None or bs<900: return None
    m=(lbl==best)
    # 두 칸이 붙어 잡혔으면 이 영역 안쪽만 남긴다
    if m.sum() > (y1-y0)*(x1-x0)*0.9 or (np.where(m)[0].max()-np.where(m)[0].min()) > (y1-y0)*1.3:
        keep=np.zeros_like(m); keep[y0:y1, x0:x1]=True
        m = m & keep
        m = ndimage.binary_opening(m, np.ones((3,3)))
        l2,c2=ndimage.label(m)
        if c2>1:
            sz=ndimage.sum(m,l2,range(1,c2+1))
            m=(l2==int(np.argmax(sz))+1)
        if m.sum()<900: return None
    ys,xs=np.where(m)
    y0b,y1b,x0b,x1b=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    rgb=A[y0b:y1b, x0b:x1b]
    msk=ndimage.binary_fill_holes(m[y0b:y1b, x0b:x1b])
    return Image.fromarray(np.dstack([rgb,(msk*255).astype(np.uint8)]),'RGBA')

NAMES=[['idle','walk','run'],
       ['atk0','atk1','atk2'],
       ['dodge0','dodge1','dodge2'],
       ['hit','death','death2']]
raw={}
for ri,(y0,y1) in enumerate(ROWS):
    for ci,(x0,x1) in enumerate(COLS):
        nm=NAMES[ri][ci]
        im=pick(y0,y1,x0,x1)
        if im: raw[nm]=im; print("  %-8s %dx%d"%(nm,im.width,im.height))
        else:  print("  %-8s 없음"%nm)
json.dump(list(raw.keys()),open('/tmp/bk.json','w'))
# 공통 규격 — 몸높이 48 기준
TARGET=48
mh=max(i.height for i in raw.values())
sc=TARGET/mh
Wc=int(np.ceil(max(i.width for i in raw.values())*sc))+4
Hc=int(np.ceil(mh*sc))+3
for nm,im in raw.items():
    w2=max(2,round(im.width*sc)); h2=max(2,round(im.height*sc))
    r2=im.resize((w2,h2),Image.LANCZOS)
    a2=np.array(r2); a2[:,:,3]=np.where(a2[:,:,3]>110,255,0)
    # 경계에 섞인 마젠타 잔여물 제거
    rr,gg,bb=a2[:,:,0].astype(int),a2[:,:,1].astype(int),a2[:,:,2].astype(int)
    pur=(a2[:,:,3]>0)&(rr-gg>18)&(bb-gg>18)
    a2[:,:,3][pur]=0
    out=Image.new('RGBA',(Wc,Hc),(0,0,0,0))
    out.alpha_composite(Image.fromarray(a2,'RGBA'),((Wc-w2)//2, Hc-2-h2))
    out.save('assets/bandit_%s.png'%nm)
print("규격 %dx%d"%(Wc,Hc))
json.dump({'w':Wc,'h':Hc,'frames':sorted(raw.keys())},open('banditmeta.json','w'),ensure_ascii=False,indent=1)
