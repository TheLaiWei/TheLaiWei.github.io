# Face to Face Poker

Two players share a portrait phone with its short edges facing the players. The dealer posts the small blind. The dealer acts first before the flop and second on later streets. Shield your private cards and hold either private card to see them. Release to hide. Tap chips to stage a wager, then confirm the total shown. After a fold the cards stay hidden. At showdown both hands are public. The players decide when to deal again.

## Preview from the download

Unzip the entire folder. In Terminal, change to the extracted folder (on a Mac, type `cd `, drag the folder into Terminal, then press Return). Run:

    python3 -m http.server 8000 --bind 127.0.0.1

Open http://localhost:8000/poker/ on the same computer. Press Control-C in Terminal to stop. A local HTTP server is required for JavaScript modules. The Back to website link goes to the local server root in this preview.

## Apply to your website locally

The included binary-safe patch targets TheLaiWei/TheLaiWei.github.io at 18b41f724a6b0a991793b2d60843fd0cce6daaa0. In a clean checkout of the website, create a review branch and point git at the patch in the extracted download:

    git switch -c review/poker-redesign
    git apply --check /path/to/poker-redesign.patch
    git apply /path/to/poker-redesign.patch
    npm run test:poker

Use Node.js 22 or newer. The engine and test suite use built-in modules. To run the optional exhaustive evaluator check, use `node tests/poker/exhaustive.mjs`. For a phone-sized preview in the repository, run:

    npm run preview:poker:prepare
    python3 -m http.server 8000 --directory .poker-preview --bind 127.0.0.1

Open http://localhost:8000/ for the viewport chooser. To test the entire website with its existing Ruby dependencies installed, run `bundle exec jekyll serve`, open /projects/, follow the game link, then check navigation back to the homepage, search, and academic pages.

## Physical iPhone review

Check both orientations of text with the phone lying flat, shield one hand at a time, and release or interrupt a peek. Try Raise, Fold, Next hand, refreshing, and returning from the lock screen. Use an HTTPS test origin for full offline and Home Screen testing on the iPhone. A laptop's localhost URL works only on that laptop. After the worker caches the game, reload once online, then test reopening offline. Checkpoint data stays in the current browser's storage. On browsers without safe tab locking, matches run in memory only.

## Rules and defaults

The first dealer is random. Blinds stay fixed for the match. Default stacks are 2,000 per player with blinds of 10/20 and denominations of 1, 5, 25 and 100. Uncalled chips return before payout. Ties split the pot, with an odd chip awarded to the non-dealer. Both live hands are revealed at showdown. The next hand requires explicit input. See [Poker TDA rules](https://www.pokertda.com/view-poker-tda-rules/) for the heads-up button and action order (Rule 34), odd chips (Rule 20), and betting rules (Rules 43 and 47).

## Publication when you choose

Review and commit the local changes. When ready to publish, merge the reviewed changes to main and push to GitHub. The existing deployment workflow runs the poker tests, builds Jekyll, and deploys the output. Confirm /poker/ loads directly and via the Projects page. For future asset updates, bump the cache version in poker/sw.js.

## Redesigned table and saved matches

Hold either private card to reveal both, or focus it and hold Space or Enter. Only one player may peek at a time. The pot shows committed chips. The rack and its balance show what is available after staging. Clear restores all staged chips. Call commits the amount owed and Bet/Raise commits the displayed staged total. Change-making uses exact chips when available, then breaks the smallest oversized chip. A completed hand displays the awarded pot amount and moves its chips into the winning racks.

Existing matches use the same local storage key. A version 1 save has no denomination history, so the game reconstructs each remaining stack and each player's committed chips from their values. Once saved in version 2, the rack composition is retained through reloads. Private peeks and unconfirmed wagers are never persisted.

## Browser verification

For the optional mobile Chromium regression suite, install Python Playwright and its Chromium browser, then run `python3 tests/poker/browser_smoke.py`. It serves the local checkout on a temporary loopback port. Set PREVIEW to a PNG path to capture the staged flop screen. CHROMIUM_PATH can point to an existing Chromium executable.
