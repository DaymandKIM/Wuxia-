"""보스 등장 문과 오라. 청록빛이라 색조로 잘라낸다."""
from PIL import Image
import numpy as np, json
from scipy import ndimage
A=np.array(Image.open('sheets/bossfx.png').convert('RGB')).astype(int)
S=378/1134.0   # 확대 3배
def cut(gx0,gy0,gx1,gy1, thr=16):
    x0,y0,x1,y1 = int(gx0*S),int(gy0*S),int(gx1*S),int(gy1*S)
    sub=A[y0:y1, x0:x1]
    r,g,b=sub[:,:,0],sub[:,:,1],sub[:,:,2]
    lum=sub.mean(2)
    # 청록: G·B가 R보다 높다. 박스 배경은 무채색에 가깝다
    teal=(g-r>thr)|(b-r>thr)
    teal=teal|(lum>110)
    # 문 안쪽의 검은 공간도 문의 일부다 — 박스 배경보다 훨씬 어둡다
    teal=teal|(lum<24)
    teal=ndimage.binary_closing(teal,np.ones((3,3)))
    if teal.sum()<200: return None
    lb,n=ndimage.label(teal)
    sz=ndimage.sum(teal,lb,range(1,n+1))
    keep=set(i+1 for i,s in enumerate(sz) if s>=max(sz)*0.02)
    m=np.isin(lb,list(keep))
    ys,xs=np.where(m)
    rgb=sub[ys.min():ys.max()+1, xs.min():xs.max()+1]
    msk=m[ys.min():ys.max()+1, xs.min():xs.max()+1]
    return Image.fromarray(np.dstack([rgb.astype(np.uint8),(msk*255).astype(np.uint8)]),'RGBA')
out={}
out['gate'] = cut(60, 60, 540, 540)     # 문
out['aura'] = cut(620, 60, 1090, 540)   # 오라
for k,im in out.items():
    if not im: print("  %s 실패"%k); continue
    print("  %-5s %dx%d"%(k,im.width,im.height))
# 문은 보스보다 크게, 오라는 보스 뒤에 깔리게
SZ={'gate':132,'aura':96}
meta={}
for k,im in out.items():
    if not im: continue
    t=SZ[k]; sc=t/im.height
    w2=max(2,round(im.width*sc)); h2=t
    mid=im.resize((w2*2,h2*2),Image.LANCZOS)
    r2=mid.resize((w2,h2),Image.LANCZOS)
    a=np.array(r2); a[:,:,3]=np.where(a[:,:,3]>100,255,0)
    Image.fromarray(a,'RGBA').save('assets/fx_%s.png'%k)
    meta[k]={'w':w2,'h':h2}
    print("     → %dx%d"%(w2,h2))
json.dump(meta,open('fxmeta.json','w'),ensure_ascii=False,indent=1)
