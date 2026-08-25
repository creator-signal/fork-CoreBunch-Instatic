/**
 * Node-ID-independent page-cell hashes captured from the immutable Instatic
 * 0.0.36 plugin package and confirmed against the post-import CMS export.
 * Both sources use Creator Signal plugin 0.3.5 at commit
 * 219b160f020fbfa4d9524c07ab7b9acb7a9fe363.
 * They allow only untouched 0.3.5 starter content to adopt the production-look
 * composition; authored rows remain migration blockers and are never replaced.
 */
export const retainedCreatorSignalPageHashes035: Readonly<Record<string, string>> = {
  'creator-signal.site/page/home': '62cd1892e90fae1980c0225547bd6919d162abb0fb0152ba765fc7ff150dcfa6',
  'creator-signal.site/page/products': 'a27e0904d234c0712ea75b45be6d5b2abfdbc792d1f2342ecbf9a6d72c632770',
  'creator-signal.site/page/sales-pulse': 'be118b6844dc593fd529def731677d7d886cf72fe5226b7aa53982e0c30548f8',
  'creator-signal.site/page/features': '5c9654a32a8982e41f88748e05648a38f27f4bb7e64260c0815c7071e3bca336',
  'creator-signal.site/page/pricing': 'bf7273087d3186bbd004b7e32e535c5116985b73c98d3edf7f1355e4ad51b6a0',
  'creator-signal.site/page/contact': '560766add7f1739bf8a8f8016b4b82c54c47538b9983f708e88ca52d6320192b',
  'creator-signal.site/page/feedback': '002e3e2ffe9dfae49635a5c2d742c4d2562e31af33d9ded3061a864c1564d62b',
  'creator-signal.site/page/wishlist': 'f0546b64364f9f5739960300c52cebf9b746f6977274feee62f31d486b8b5c5c',
  'creator-signal.site/page/early-access': 'cd5c704163a2d50adce503c8be43e33913f355df06972ed993d4a0affc777702',
  'creator-signal.site/page/ask-a-question': '451bf2c6763af82cd667bf2c6dbb35c59af3018e7cb1a91f9e621aa99c477e98',
  'creator-signal.site/page/feature-request': 'e139290c78dad838ef3abcab7d49e91627e04728c3984fb8bbb6808511677d6a',
  'creator-signal.site/page/report-an-error': 'ad074c7dc6c15ed101d9c6278fc54c244279bfac1e9db7c5c2ca9aaf447085c1',
  'creator-signal.site/page/privacy': '7346cc57c79d613af3fd87af9e453a55f268dc3aab5b67a7350c59b5dfbffc0b',
  'creator-signal.site/page/terms': '64435ea97a6dc096686826a8ecb7f4bfe048758662e614d2869bc4c076d6c2ae',
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

export const retainedCreatorSignalTemplates035 = [
  {
    slug: 'creator-signal-site-template',
    hash: '59c126a2d7791cd8ebc192d17bff3be66fc10ea6892b1d4f73dc2c31ad53207f',
  },
] as const

export const retainedCreatorSignalNotFoundTemplates035 = [
  {
    slug: 'creator-signal-not-found',
    hash: 'a33bf95e80ba899965b419913adc057ec7f0e929a1f262b2a35acd71f7fe54fb',
  },
] as const
