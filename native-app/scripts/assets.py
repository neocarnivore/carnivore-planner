"""Package the existing planner artwork as an opaque iOS icon and splash."""
from PIL import Image
from pathlib import Path
root = Path(__file__).resolve().parents[1]
icon = Image.open(root / 'vendor/meat/icon-meat-194.png').convert('RGBA')
base = Image.new('RGB', (1024,1024), '#101719')
icon.thumbnail((820,820),Image.Resampling.LANCZOS)
base.paste(icon,((1024-icon.width)//2,(1024-icon.height)//2),icon)
assets = root / 'ios/App/App/Assets.xcassets'
base.save(assets / 'AppIcon.appiconset/AppIcon-512@2x.png')
splash = Image.new('RGB',(2732,2732),'#101719')
small=base.resize((480,480),Image.Resampling.LANCZOS)
splash.paste(small,(1126,1126))
for name in ['splash-2732x2732.png','splash-2732x2732-1.png','splash-2732x2732-2.png']:
    splash.save(assets / 'Splash.imageset' / name)
