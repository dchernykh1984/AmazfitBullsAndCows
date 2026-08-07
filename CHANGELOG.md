# Changelog

## [0.3.0](https://github.com/dchernykh1984/AmazfitBullsAndCows/compare/amazfit-bulls-and-cows-v0.2.1...amazfit-bulls-and-cows-v0.3.0) (2026-08-07)


### Features

* page the guess history from the counter, which a tap can reach ([9c3ab01](https://github.com/dchernykh1984/AmazfitBullsAndCows/commit/9c3ab01d95f5114c4bb6684403f68fba63beee8c))
* play until the code is cracked instead of running out of guesses ([841732d](https://github.com/dchernykh1984/AmazfitBullsAndCows/commit/841732d90bd4d7b4586a3a064450b456f7310625))
* rank a level's best by guesses and then by time ([d5e44bc](https://github.com/dchernykh1984/AmazfitBullsAndCows/commit/d5e44bc9ad520352be1efe8069148822f5ee3e13))
* show every level's best in a records table ([c5d97bd](https://github.com/dchernykh1984/AmazfitBullsAndCows/commit/c5d97bd6faa5acb5605a5f8fc9740f43da8e078d))
* swipe back to the menu and pick the game up again ([ce7d700](https://github.com/dchernykh1984/AmazfitBullsAndCows/commit/ce7d7008f59b2e1777646a102d385f89c22d4a1e))
* time a game from the first tap to the solved code ([d013ec6](https://github.com/dchernykh1984/AmazfitBullsAndCows/commit/d013ec6154f00062b16829da5ece1aa952b1c8c3))
* turn the levels into a plain three, four or five digit ladder ([99be6ad](https://github.com/dchernykh1984/AmazfitBullsAndCows/commit/99be6adc6e1c5c484a6021f030213d59f0bb4848))


### Bug Fixes

* keep stray swipes off the records and result screens ([a1c7e5d](https://github.com/dchernykh1984/AmazfitBullsAndCows/commit/a1c7e5d48366055ab9596e536ee2b47ac2a420cd))
* read an empty stored time as no time, and drop the unused best check ([959367e](https://github.com/dchernykh1984/AmazfitBullsAndCows/commit/959367e82c03ef42cebb7f9aa033ba3cea380725))

## [0.2.1](https://github.com/dchernykh1984/AmazfitBullsAndCows/compare/amazfit-bulls-and-cows-v0.2.0...amazfit-bulls-and-cows-v0.2.1) (2026-08-06)


### Bug Fixes

* report the released version on the watch instead of 0.1.0 ([b066f1c](https://github.com/dchernykh1984/AmazfitBullsAndCows/commit/b066f1cc0d8222aa2b22a6e0aed230d5803dba33))

## [0.2.0](https://github.com/dchernykh1984/AmazfitBullsAndCows/compare/amazfit-bulls-and-cows-v0.1.0...amazfit-bulls-and-cows-v0.2.0) (2026-08-04)


### Features

* add round-screen geometry for the keypad ring and history ([6223315](https://github.com/dchernykh1984/AmazfitBullsAndCows/commit/6223315e3140d151a5926e548d83f500f37711b2))
* add the Bulls and Cows rule set with difficulty levels ([506f7bc](https://github.com/dchernykh1984/AmazfitBullsAndCows/commit/506f7bc5386c0de1f5141bda731eaccb671ecf22))
* add the watch screen with the ring keypad and guess history ([a2085b6](https://github.com/dchernykh1984/AmazfitBullsAndCows/commit/a2085b67647d6022f58457f02cefc79db602fdb3))
* localize the on-watch text into eleven languages ([6a6d247](https://github.com/dchernykh1984/AmazfitBullsAndCows/commit/6a6d247b9d2c22cf808f929d9993424b04f70f3c))
* register the app as Bulls & Cows with its store appId ([f5b00c6](https://github.com/dchernykh1984/AmazfitBullsAndCows/commit/f5b00c697dbbae0bfb7824977aa2b4262e21ec55))


### Bug Fixes

* explain the notation on the watch and budget the labels by their boxes ([f1b395b](https://github.com/dchernykh1984/AmazfitBullsAndCows/commit/f1b395b787ab45ebf4a1bb7b1fe85f4353f7a3a4))
* fall back to the platform random source if the clock is unavailable ([74c2e28](https://github.com/dchernykh1984/AmazfitBullsAndCows/commit/74c2e28cec311f36160afa805852d1840a5f4ec8))
* fit the screen, its labels and its gestures to a real round watch ([12dd87e](https://github.com/dchernykh1984/AmazfitBullsAndCows/commit/12dd87ecb48ea907b6c64d8777ce7899fd75b586))
* keep a missing value from reading as a real one in storage and rules ([6b0ee37](https://github.com/dchernykh1984/AmazfitBullsAndCows/commit/6b0ee372169cd65563d5e34e0b9d314cec405d8c))
* keep the source ASCII, quoting the long labels from the i18n table ([2b1d215](https://github.com/dchernykh1984/AmazfitBullsAndCows/commit/2b1d2158db23167fd3e953c64f7379bbf057dd09))
* seed the secret from the clock and harden the release workflow ([c1f6b4b](https://github.com/dchernykh1984/AmazfitBullsAndCows/commit/c1f6b4b72e2dc3dc477f252cfba67b61cc7eb0f3))
