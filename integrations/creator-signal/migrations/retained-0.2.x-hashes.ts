/**
 * Canonical page-cell hashes captured from the exact governed Creator Signal
 * 0.2.0 pack at commit 8cdeb15d. Page content stayed byte-identical through
 * plugin 0.2.6. These values are a migration trust boundary: never regenerate
 * them from a newer pack.
 */
export const retainedCreatorSignalPageHashes0200To0206: Readonly<Record<string, string>> = {
  'creator-signal.site/page/home': '63a460bf253af25e7e627e131380098848735d42ff977b64c1524b1535f01344',
  'creator-signal.site/page/products': '7a39e98a0c91cf666fa7a01a03e6f7e94b0d1424712b052e2c497d73df1efe1f',
  'creator-signal.site/page/sales-pulse': '8bf8121e599e4273ea6ba80d1d98ab8bb2e3ba52ab9729f63f58c2a64e142c50',
  'creator-signal.site/page/features': '21860bcfe22423caf32382fe7b0b66885c7f16b81ae79aeb53bffd781b912a34',
  'creator-signal.site/page/pricing': '7ad42d27ecef5dc4472907bf1ba2e9f438272fd601c9d41fd1828a419a521f92',
  'creator-signal.site/page/contact': '156070613d7c2015ebb0d45bbfaebb465919a030fb5f495359b1ede011a5244d',
  'creator-signal.site/page/feedback': '5b825f8b8be22c0d2c9d035e9902d8d87018adaf1d74a7eea742b36339d1595c',
  'creator-signal.site/page/wishlist': '5d53f7be975a67e3c65758a7918c4b2687424f5cb96df61f57bb819fb50aa83f',
  'creator-signal.site/page/ask-a-question': '187b974a58ec55392e0d9838a6321ada10cdb8ee319e4f1de801f032d2684dca',
  'creator-signal.site/page/feature-request': '5c761e6b8a20cac44c543c4da07488734fd4cb8ef54681764bac94b95500a000',
  'creator-signal.site/page/report-an-error': '055c964a2f951edcf8c0f54cf0e8e6b6c84b8d6be117c2b10cef1c278b9f8dba',
  'creator-signal.site/page/privacy': '57c1569b44e697b64b58dd83d3b47774e1261073ae5f3fe378b5232a6d8f8636',
  'creator-signal.site/page/terms': '49020d6fbcd112d9d341f706a7741dcf230ed40ad0d52e9a60d2bda997354dca',
  'creator-signal.site/page/billing': '914f79038f9baa1bdec7601fd7935081d2e529d8287f86a3747bf83ecff5dd7e',
  'creator-signal.site/page/acceptable-use': 'f0a7aac9de867b8991256084062896e5791401aa3a35951eb1c931966e235ec2',
  'creator-signal.site/page/browser-extension': '522c3ad1991bdc7fd944d23beceaa497bf7d4f66354c834c0ed995fba13bd76d',
  'creator-signal.site/page/cookies': 'a88f12a1cc29ee4d2dd6ecc19511cf00d1c9018bb72cfa670b0bbf6dbe094c6f',
  'creator-signal.site/page/dpa': '561e63f64562d9e08d550be8f7bfbedf2968d6e9e98b1208b4e3230273da99a5',
  'creator-signal.site/page/security': '6f7d79055c2abe712dc95d456f9342de3fc2815f10feed17ed9c8eeb223bf4ac',
  'creator-signal.site/page/subprocessors': '40b7d5247fa8f7c89863048c45b5cb62b2cff5b2ffa9681eca3f5cd52b49d0f4',
  'creator-signal.site/page/support': 'ef867d63bb8edf93faa9cc0a91d54574552d9b6e82173cadbc9826b4ee12a29f',
  'creator-signal.site/page/account-data': 'a2597f195913421e743a43b62591eed791cea37cfcc1d743a37a36092584f1ef',
  'creator-signal.site/page/status': 'dc12df3f97acf3aca28722386f71a9008837616fa823510867133578b0b6fe05',
}

/**
 * The initial 0.2.0 template used an invalid slug. The repaired hash is exact
 * for commits ed78b3aa through 23b864a7 (plugin 0.2.0 through 0.2.6).
 */
export const retainedCreatorSignalTemplates0200To0206 = [
  {
    slug: '_templates/creator-signal-site',
    hash: '541dbe0de9df281d1785c75ade65d7473e721ef36ef9e58fcadaee0447232ea2',
  },
  {
    slug: 'creator-signal-site-template',
    hash: 'e541f13c931e8e2f784428eb786f600bc0f123e98c79f7538416fe6a110aaf89',
  },
] as const
