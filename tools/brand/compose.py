import subprocess, os
F=os.path.expanduser('~/workspaces/personal/projects/personal/isacademy/assets/fonts')
AL=f'{F}/allura-latin.woff2'; SG=f'{F}/space-grotesk-latin.woff2'
def g(font,size,w,tr,x,y,t):
    o=subprocess.run(['./glyphs',font,str(size),str(w),str(tr),str(x),str(y),t],capture_output=True,text=True,check=True).stdout.split('\n')
    return float(o[0]), o[1]
_,is_d=g(AL,300,0,0,70,250,'Is')
advA,a_d=g(SG,188,500,-2,296,245,'A')
advC,c_d=g(SG,150,500,-2,296+advA,245,'cademy')
end=296+advA+advC+2  # trailing tracking
advB,_=g(SG,20,400,6,0,0,'by Ismael Sarmiento')
_,by_d=g(SG,20,400,6,end-advB-6,300,'by Ismael Sarmiento')
def logo(name, isc, acc, byc, by=True):
    body=f'<path fill="{isc}" d="{is_d}"/>\n  <path fill="{acc}" d="{a_d}{c_d}"/>'
    if by: body+=f'\n  <path fill="{byc}" d="{by_d}"/>'
    open(name,'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="VIEWBOX">\n  <title>IsAcademy by Ismael Sarmiento</title>\n  {body}\n</svg>\n')
logo('isacademy-logo.svg','#c8953f','#1c2547','#4a5170')
logo('isacademy-logo-dark.svg','#e2b25c','#f6f1e7','#b9bdd3')
logo('isacademy-wordmark.svg','#c8953f','#1c2547','#4a5170',by=False)
# monogram: Is centred in a 1024 square
_,m_d=g(AL,760,0,0,0,0,'Is')
open('is-mono-raw.txt','w').write(m_d)
print(advA,advC,end,advB)
