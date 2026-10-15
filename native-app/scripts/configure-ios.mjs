import fs from 'node:fs';
const f='ios/App/App.xcodeproj/project.pbxproj';let s=fs.readFileSync(f,'utf8');
if(!s.includes('AA0000000000000000000001')){
  s=s.replace('/* Begin PBXBuildFile section */','/* Begin PBXBuildFile section */\n AA0000000000000000000001 /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = AA0000000000000000000002; };');
  s=s.replace('/* Begin PBXFileReference section */','/* Begin PBXFileReference section */\n AA0000000000000000000002 /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };');
  s=s.replace('504EC3131FED79650016851F /* Info.plist */,','504EC3131FED79650016851F /* Info.plist */,\n AA0000000000000000000002 /* PrivacyInfo.xcprivacy */,');
  s=s.replace('504EC3121FED79650016851F /* LaunchScreen.storyboard in Resources */,','504EC3121FED79650016851F /* LaunchScreen.storyboard in Resources */,\n AA0000000000000000000001 /* PrivacyInfo.xcprivacy in Resources */,');
}
s=s.replaceAll('TARGETED_DEVICE_FAMILY = "1,2"','TARGETED_DEVICE_FAMILY = 1').replaceAll('MARKETING_VERSION = 1.0','MARKETING_VERSION = 0.1.0');fs.writeFileSync(f,s);
const info='ios/App/App/Info.plist';let p=fs.readFileSync(info,'utf8');
if(!p.includes('ITSAppUsesNonExemptEncryption'))p=p.replace('<key>LSRequiresIPhoneOS</key>','<key>ITSAppUsesNonExemptEncryption</key><false/>\n<key>LSRequiresIPhoneOS</key>');
fs.writeFileSync(info,p);
