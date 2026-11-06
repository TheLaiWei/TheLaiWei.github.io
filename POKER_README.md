# Face to Face Poker

Two players share a portrait phone with its short edges facing the players. The dealer posts the small blind. The dealer acts first before the flop and second on later streets. Shield your private cards and hold Peek to see them. Release to hide. Tap chips to stage a wager, then confirm the total shown. After a fold the cards stay hidden. At showdown both hands are public. The players decide when to deal again.

## Preview from the download

Unzip the entire folder. In Terminal, change to the extracted folder (on a Mac, type `cd `, drag the folder into Terminal, then press Return). Run:

    python3 -m http.server 8000 --bind 127.0.0.1

Open http://localhost:8000/poker/ on the same computer. Press Control-C in Terminal to stop. A local HTTP server is required for JavaScript modules. The Back to website link goes to the local server root in this preview.

## Apply to your website locally

The included binary-safe patch targets TheLaiWei/TheLaiWei.github.io at c3372472bdd1beac7b340ca2b9482c7b60b7af92. In a clean checkout of the website, create a review branch and point git at the patch in the extracted download:

    git switch -c review/shared-phone-poker
    git apply --check /path/to/shared-phone-poker.patch
    git apply /path/to/shared-phone-poker.patch
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

## Verification performed

39 Node tests passed, covering poker rules, payouts, saved state, interaction guards and static integration. All 2,598,960 five-card combinations produced the expected category counts. Earlier browser checks exercised staging bets and post-flop turn order. A fresh browser run for final offline and recovery checks was blocked by this environment's socket restrictions. A physical iPhone Safari session and a full Jekyll build remain to be verified.
