---
title: "Why Globle's Colours Lie: The Heat Scale Explained"
description: "The colour ramp stops at 12,000 km but the world does not. We mapped every band to real kilometres and found where the scale quietly gives up."
date: 2026-07-20
tags: ["globle mechanics", "heat scale", "data study"]
cover: "/blog/globle-heat-scale-explained/cover.svg"
coverAlt: "Atlas-style illustration of the Globle colour ramp running from pale yellow to deep red beside a kilometre scale, titled Why Globle's Colours Lie"
---

**The colour on your guess is not a rating. It is a measurement, rounded badly.** Understanding exactly how badly is worth more than any list of tips, because it tells you when to trust the colour and when to stop looking at it.

Here is the short version: the ramp runs from 0 to 12,000 km across five stops. The furthest two countries in the dataset are 19,932 km apart. **Everything past 12,000 km is the same colour.**

**What you'll learn**

- What each of the five colour stops means in kilometres
- Why two identical pale yellows can be 5,000 km apart
- How many countries hide in each band, from four different openings
- The point at which you should stop reading colour entirely

## What the Colour Actually Measures

Every guess is scored on one number: the great-circle distance between your guess's centre point and the answer's centre point.

### Centroid to centroid, great-circle

Great-circle distance is the shortest path over the surface of a sphere. It is the honest way to measure on a globe, and it is what the game uses.

The centroid part is where it gets loose. Each country is reduced to a single representative point, and everything is measured from there.

#### Why centroid distance isn't how far you'd travel

Russia's centroid is in Siberia. Chile's is somewhere in the middle of a 4,300 km ribbon.

Guess Chile against a Peru answer and the reading reflects the distance between two arbitrary interior points, not the fact that the two countries share a border. Long, thin and enormous countries all misreport this way.

> 📝 **Note:** this is why a neighbour of the answer sometimes reads cooler than a country further away. The centroid, not the border, is what got measured.

## The Five Stops, in Kilometres

![The five colour stops mapped to distance, 0 to 12,000 km](/blog/globle-heat-scale-explained/fig-1-stops.svg)

*Plate 1 - each segment covers 3,000 km.*

The ramp has five colour stops spread evenly across a 12,000 km range.

| Stop | Colour | Distance |
|---|---|---|
| 1 | Deep red | 0 km |
| 2 | Red | 3,000 km |
| 3 | Orange | 6,000 km |
| 4 | Amber | 9,000 km |
| 5 | Pale yellow | 12,000 km and beyond |

**Each colour segment covers 3,000 km.** For scale, 3,000 km is roughly London to Cairo, or the full width of the continental United States.

### Reading the gradient between stops

The colour does not jump at each stop; it interpolates smoothly between them. A guess at 1,500 km sits halfway between deep red and red.

In principle that gives you continuous information. In practice your eye resolves maybe four or five steps inside a single 3,000 km segment, which puts your real precision somewhere around 600–700 km.

#### What 600 km of precision means

It means that inside Europe, colour is nearly useless. Vienna to Warsaw is 550 km. Belgrade to Budapest is 320 km.

A whole cluster of European answers will read as the same shade from anywhere outside Europe, which is exactly what we found when [measuring capitals](/blog/guess-any-capital-city).

## Why Two Pale Yellows Can Be 5,000 km Apart

![Range chart showing the pale-yellow band spans 5,182 km against about 2,700 km for the others](/blog/globle-heat-scale-explained/fig-2-saturation.svg)

*Plate 2 - the coldest band absorbs everything past the ceiling.*

This is the flaw worth knowing about.

### The scale saturates

The ramp's coldest stop is 12,000 km. Anything beyond that clamps to the same pale yellow — there is no colder colour to show.

But the planet is bigger than that. The two most distant countries in our dataset, Paraguay and Taiwan, sit 19,932 km apart, which is close to antipodal.

### What that looks like in practice

Measured from Greece, here is the range of real distances inside each band:

| Band | Real distance range | Spread |
|---|---|---|
| Deep red | 264–2,956 km | 2,692 km |
| Red | 3,031–5,959 km | 2,928 km |
| Orange | 6,293–8,941 km | 2,648 km |
| Amber | 9,040–11,776 km | 2,737 km |
| **Pale yellow** | **12,146–17,328 km** | **5,182 km** |

The first four bands each span roughly 2,700 km, as designed. **The pale-yellow band spans 5,182 km — nearly twice as wide as any other**, because it absorbs everything the scale can no longer distinguish.

#### The practical consequence

A pale-yellow guess tells you "more than 12,000 km away." It does not tell you 12,000 or 17,000, and those are wildly different answers.

Treat pale yellow as an absence of information rather than a data point.

To put the 5,182 km spread in perspective: that is wider than the Atlantic at its widest, and wider than the entire continental United States. Two guesses separated by that much can produce swatches you could not tell apart if they were side by side.

## How Many Countries Hide in Each Band

![Grouped bars showing 129 of 175 countries fall in one band from New Zealand](/blog/globle-heat-scale-explained/fig-3-openers.svg)

*Plate 3 - what a corner opener costs.*

The saturation problem gets much worse depending on where you guess from. We counted how the other 175 countries distribute across the five bands from four different openers.

| Band | Greece | Kazakhstan | Brazil | New Zealand |
|---|---|---|---|---|
| Deep red | 58 | 24 | 11 | 2 |
| Red | 52 | 69 | 24 | 5 |
| Orange | 26 | 41 | 40 | 6 |
| Amber | 29 | 18 | 61 | 33 |
| Pale yellow | 10 | 23 | 39 | **129** |

### The New Zealand column is the whole argument

**From New Zealand, 129 of 175 countries — 74% — are the same pale yellow.**

You have spent a guess to learn that the answer is one of 129 things. That is barely better than knowing nothing.

### Greece spreads the field

Greece puts 58 countries in deep red, 52 in red, and only 10 in the saturated band. Every band carries real information.

This is the measurable version of the advice in [our opening-country study](/blog/best-globle-starting-country): central openers work because they use the whole scale, not just the end of it.

#### Kazakhstan and Brazil sit in between

Kazakhstan piles 69 countries into the red band — a fat middle, but at least the extremes stay informative.

Brazil pushes 61 into amber and 39 into pale yellow, because most of the world's landmass is on the other side of the Atlantic from it.

## The Colours That Look Identical But Aren't

![Plate listing country pairs closer than 600 km, whose colours are indistinguishable](/blog/globle-heat-scale-explained/fig-4-resolution.svg)

*Plate 4 - below your resolution limit, stop measuring.*

Some pairs are genuinely indistinguishable on screen. These are worth memorising as "do not bother."

### Inside 600 km, give up on colour

Any two countries whose distances from your guess differ by less than about 600 km will look the same. In practice that covers:

- Most of the Balkans, from anywhere outside Europe
- The Gulf states, from anywhere outside the Middle East
- Central America, from anywhere outside the Americas
- The eastern Caribbean, from almost anywhere

### Above 12,000 km, colour is gone entirely

Not approximately gone. Gone. The scale has no way to represent the difference, and no amount of squinting will recover it.

#### How to tell which case you are in

If your guess reads mid-scale — orange or amber — the colour is still doing work, and a second widely separated guess will triangulate well.

If it reads palest yellow, do not triangulate off it. Guess somewhere completely different and get a reading the scale can actually express.

## How This Compares to Other Feedback Systems

Colour is one way to report distance. It is not the only one, and the alternatives fail differently.

### Proximity percentage

Worldle-style games report closeness as a percentage instead of a colour. Our own [silhouette mode](/silhouette) does the same, scoring against half the Earth's circumference — 20,000 km — so 0% means antipodal and 100% means correct.

The advantage is obvious: a percentage never saturates. 3% and 12% are visibly different numbers, where the equivalent colours are not.

### Compass direction

The silhouette modes add an eight-point compass arrow pointing from your guess toward the answer. That single arrow is worth more than any colour, because it removes an entire dimension of uncertainty.

The country game deliberately withholds it. Distance alone is the constraint that makes the puzzle what it is.

#### Why the globe game keeps colour anyway

Colour is spatial. Painted onto a 3D globe, forty guesses form a visible gradient you can read at a glance, which a column of percentages cannot do. You see the shape of your own search, not just its last step.

The trade is precision for legibility. Knowing where the trade breaks down — below 600 km and above 12,000 km — is how you play around it.

## Why the Scale Is Built This Way

It is tempting to call the 12,000 km ceiling a bug. It is closer to a deliberate compromise.

### The alternative would be worse

Stretch the ramp to the true maximum of roughly 20,000 km and every segment grows from 3,000 km to 5,000 km.

That would make the saturation problem disappear and make the *useful* end of the scale much blunter. Guesses at 500 km and 2,500 km would become harder to tell apart — and those are the guesses that actually decide rounds.

### Precision is spent where it matters

By capping at 12,000 km, the design spends its limited colour resolution on the near half of the range, where you are closing in.

The far end is sacrificed because a guess 17,000 km away and one 13,000 km away call for the same response: guess somewhere else entirely.

#### The green exception

A correct guess is not the hottest red. It is a distinct green, reserved for the answer alone.

That matters because a neighbouring country can sit at almost 0 km from the answer's centroid and read as maximum red. Without a separate win colour you could not tell "adjacent" from "correct."

## Turning the Scale Into a Decision Rule

![Flow diagram mapping each colour band to the right next move](/blog/globle-heat-scale-explained/fig-5-decision.svg)

*Plate 5 - the colour is only information in the middle of its range.*

Three rules follow directly from the numbers above.

### Rule 1: never open from a corner

A corner opener puts most of the world into the saturated band. Greece leaves 10 countries there; New Zealand leaves 129.

### Rule 2: treat pale yellow as "start over"

A pale-yellow reading is not a direction. It is the scale telling you it cannot help from here.

Your next guess should be somewhere far away — not a small adjustment from the last one.

### Rule 3: once you are hot, stop reading and start naming

Below roughly 600 km the colour stops resolving. If two guesses both read deep red and you cannot tell them apart, you are inside the resolution limit.

At that point the efficient move is to enumerate the candidates in the region rather than hunt for a shade difference that is not there.

#### A worked sequence

Open Greece. Suppose it reads mid-orange — somewhere around 6,000–7,000 km.

Second guess: something 90 degrees away, say Brazil or Indonesia, not Italy. Two mid-scale readings intersect in a small lens.

Third guess onward: you are probably inside a region now. Switch from measuring to naming.

## Testing It Yourself

You do not have to take any of this on trust. Three checks you can run in a single round.

### Check the saturation

Guess New Zealand, then guess Fiji. They are 2,987 km apart — almost a full colour segment — and against most answers both will still read as the same pale yellow.

If two guesses that far apart produce an identical colour, you have found the ceiling. Note how much information that costs: nearly 3,000 km of separation, reported as no difference at all.

### Check the centroid effect

Against an answer in South America, guess Chile and then guess Bolivia. Chile is a 4,300 km ribbon whose centroid sits well south of most of the continent's population.

The reading will often flatter Bolivia over Chile even when Chile shares more border with the region you are hunting.

### Check your own resolution

Guess two countries roughly 500 km apart — Austria and Slovakia (422 km), say, or Ghana and Ivory Coast (484 km).

Look at the two swatches side by side. If you cannot tell them apart, you have just measured your personal precision limit, and you now know when to stop reading colour.

#### What to do with that number

Whatever your limit turns out to be, the rule is the same: once two guesses fall inside it, stop trying to squeeze information out of shade differences.

Switch to naming candidates. It is faster and it does not depend on your monitor.

## What This Article Can't Tell You

**It assumes the dataset's centre points.** Every distance here is measured on our 176 country centroids. A different dataset would move some figures, though not the shape of the argument.

**It cannot predict your screen.** Colour resolution depends on display, brightness and colour vision. The 600 km figure is a reasonable middle, not a universal constant.

**It says nothing about which answers are likely.** The scale behaves identically whether the answer is France or Vanuatu. What changes is how much the saturation hurts, and that depends entirely on where you opened.

## Frequently Asked Questions

<details>
<summary>How does Globle's colour system work?</summary>
<p>Each guess is coloured by the great-circle distance between its centre point and the mystery country's centre point. The ramp runs from deep red at 0 km through red, orange and amber to pale yellow at 12,000 km, with each segment covering 3,000 km.</p>
</details>

<details>
<summary>What does pale yellow mean in Globle?</summary>
<p>It means the guess is at least 12,000 km from the answer — but no more than that. The scale saturates at 12,000 km, so a country 12,146 km away and one 17,328 km away are the identical shade. Treat pale yellow as an absence of information.</p>
</details>

<details>
<summary>Why does a neighbouring country sometimes read cooler than expected?</summary>
<p>Because the game measures centre point to centre point, not border to border. Long or very large countries such as Chile, Russia and Brazil have centroids far from their borders, so a shared border can still produce a substantial centroid distance.</p>
</details>

<details>
<summary>How precise is the Globle colour scale?</summary>
<p>Each colour segment covers 3,000 km, and most people resolve four or five steps within a segment, which puts practical precision around 600–700 km. Differences smaller than that — most of the Balkans, the Gulf, Central America — are not readable by eye.</p>
</details>

<details>
<summary>What are the two most distant countries?</summary>
<p>In our 176-country dataset, Paraguay and Taiwan, 19,932 km apart and close to antipodal. Both would appear as the same pale yellow from the other, since that is 7,900 km past the point where the colour scale stops distinguishing.</p>
</details>

---

**Method.** Colour stops and the 12,000 km maximum are read directly from the game's own `color.ts`. Distances are great-circle on country centre points, computed with the same haversine the game scores with. Band counts and spreads are reproducible from `scripts/blog-data.mjs` in our repository.

See it in action: [play Globle Unlimited](/), or read the [full rules and colour guide](/how-to-play).
