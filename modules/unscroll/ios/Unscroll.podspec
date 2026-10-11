Pod::Spec.new do |s|
  s.name = 'Unscroll'
  s.version = '1.0.0'
  s.summary = 'On-device focus controls'
  s.description = 'Family Controls, Managed Settings and Device Activity bridge.'
  s.author = 'Unscroll'
  s.homepage = 'https://example.invalid/unscroll'
  s.license = { :type => '0BSD' }
  s.platforms = { :ios => '17.4' }
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '*.{h,m,mm,swift}'
  s.frameworks = 'FamilyControls', 'ManagedSettings', 'DeviceActivity', 'SwiftUI'
  s.resource_bundles = { 'UnscrollPrivacy' => ['PrivacyInfo.xcprivacy'] }
  s.swift_version = '5.0'
end
