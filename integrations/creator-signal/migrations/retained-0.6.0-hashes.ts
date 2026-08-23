/**
 * Node-ID-independent hashes captured from the untouched Creator Signal 0.6.0
 * pack at commit f63efdc16073af00b2efb2045c8a27b134f6aa62 before the route-wide
 * page-body authoring migration. They are an immutable trust boundary: only
 * exact starter rows may move to 0.7.0 automatically; authored content remains
 * a blocker.
 */
export const retainedCreatorSignalPageHashes060: Readonly<Record<string, string>> = {
  'creator-signal.site/page/home': '1230acbc73242b4e84517a5272f9ae79884d6b6153086b662cdf7e23ca572e18',
  'creator-signal.site/page/products': 'a956a504f303f618be49463ec3ff0f4f2d32952e0365597f66574e1be9c191a2',
  'creator-signal.site/page/sales-pulse': 'bd458409852dc23e28dadca7c962a1c6f3a4d6c154d076bc554781e335ba879c',
  'creator-signal.site/page/features': '9241ce73730b24e9c259cdd96e940b58cf1057f2052c163396db853b275db96e',
  'creator-signal.site/page/pricing': '32a8d2f3e05c8716abb9ae9232fda095558230d987c46b306d02b796d0ad02f0',
  'creator-signal.site/page/contact': 'bfada871f34d696ea31f3296eff75dc25d0b6cc2754251063ed3b5b72f591fd8',
  'creator-signal.site/page/feedback': '5f65462112bf285584b4379456139f72640cadc71ebdee2ff1b66841a9a32da1',
  'creator-signal.site/page/wishlist': '3366b57b56d75df1247b0c9848f6eab3ff2e03114251cee01ff0a715f7dc4c6a',
  'creator-signal.site/page/early-access': '8c0737f231f78cf5fcc0cb415f5a491575749e8a124e782f1083b6f62e7388d0',
  'creator-signal.site/page/waitlist': 'e45d60394122c6f9f73d04bfafcac2668e75ad022a5cae26439e13d49a1a014a',
  'creator-signal.site/page/beta': '280540b8c15e2dfc65968f194f1159faeab2380fa0ccb877fb0e387307748b49',
  'creator-signal.site/page/ask-a-question': '064943cb3581a8ac634d9e411612472ba9e43067f30821e2c8236b42d31cf196',
  'creator-signal.site/page/feature-request': '49aebd60d722466805d59d7771f9781de31e0d39a781f37dbc1e1e9a084588a4',
  'creator-signal.site/page/report-an-error': 'b78f8c86e985de32aad6d28d40f5ceda9023531e1e97a52af811a8f820073872',
  'creator-signal.site/page/privacy': '076dafa513e8a9e9b66fd772e60c97153cf36bcd78cbfe1c5674296193427104',
  'creator-signal.site/page/terms': '39d8a02705450d8a19f39ec78e9e26fc87866e1ff641ecd4ee4ed288d14951e8',
  'creator-signal.site/page/billing': '1c65a1a13fe8ef261966424c02a864ef54df76ce200c2ec0136952d1a80b657b',
  'creator-signal.site/page/acceptable-use': 'b7324fec342cf5d3b8f799ec6424b297f9ead1bf952706c799d31143a31d2491',
  'creator-signal.site/page/browser-extension': '63f1a256522c54596877b1fd7d5084ec050df84d8dc722ba9c034de557d70307',
  'creator-signal.site/page/cookies': '8d332d63b43d39aa173dd98f98b2d7aea188511e03b7b36e5171dd5b17377129',
  'creator-signal.site/page/dpa': 'ac7f596954f818de2443a10d3cad2c1d3a72112df018b8427243f6efe06c54a4',
  'creator-signal.site/page/security': '70a2949a5a8c809cb426e07011525bdd90246eb1c7023dfef788b24c09fcd1f7',
  'creator-signal.site/page/subprocessors': '29b2c3eb4ffeff9ceda7fb90f1cbcfa5f1f372c12f22edc13544cd0cf1cd4eb2',
  'creator-signal.site/page/support': '0ebe7faaa0a8f21f425031d07de3581c0d86eeba38c9476ff92068c914332e2f',
  'creator-signal.site/page/account-data': '086b671096dbeb1ce786f024a67ed7407937d2c8fb0e5b1263b790aae57b1f44',
  'creator-signal.site/page/status': 'bc1da481b230629f9f574184b16be201c340f87af2fd5a66ce8e62d0f7be6636',
}

export const retainedCreatorSignalTemplates060 = [{
  slug: 'creator-signal-site-template',
  hash: 'f5c3624648b6a2abee2318519ba98ada1edf8d6dab3bdc721a6e7a0ce50f1767',
}] as const

export const retainedCreatorSignalNotFoundTemplates060 = [{
  slug: 'creator-signal-not-found',
  hash: 'a33bf95e80ba899965b419913adc057ec7f0e929a1f262b2a35acd71f7fe54fb',
}] as const
