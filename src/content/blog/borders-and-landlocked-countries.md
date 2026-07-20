---
title: "Borders and Landlocked Countries: A Guesser's Map"
description: "China touches 16 countries and 23 touch none. We mapped every land border in the pool and found that neighbour count predicts difficulty almost perfectly."
date: 2026-07-20
tags: ["landlocked countries", "borders", "data study"]
cover: "/blog/borders-and-landlocked-countries/cover.svg"
coverAlt: "Atlas-style illustration of continents overlaid with a web of border connections, densest across Europe and central Africa, titled Borders and Landlocked Countries"
---

**Border counts are the most underrated piece of information in a country-guessing game.** Not because the borders themselves are ever a clue, but because the number of them tells you how a country behaves as an answer.

We counted the land neighbours of all 176 countries in our pool and tested the count against how hard each country actually is to find. The relationship turned out to be almost perfectly monotonic — and it runs in the direction most players expect backwards.

**What you'll learn**

- Why a country with 16 neighbours is the easiest kind of answer there is
- The 23 countries in the pool with no land border at all
- Where the 40 landlocked countries cluster, and why that matters mid-game
- The measured link between neighbour count and difficulty

## What a Border Count Actually Tells You

A distance game gives you warmth. Warmth is only useful if there is something warm nearby to walk in from.

### Neighbours are a trail of near-misses

When the answer has many land neighbours, the map around it is crowded. Almost any guess in the region lands adjacent to the answer and reads hot, and each of those hot readings points inward.

When the answer has none, there is no trail. You either hit the right island or you get a cold reading that could mean a dozen different places.

### This is why big connected countries are easy

It sounds wrong. Surely a country with 16 neighbours is buried in a confusing tangle?

In practice the opposite holds. The tangle *is* the clue. Sixteen neighbours means sixteen different guesses that will all point you at the answer.

## The Most-Connected Countries

![Bar chart showing China with 16 land neighbours and Russia with 14](/blog/borders-and-landlocked-countries/fig-2-most-connected.svg)

*Plate 2 - more neighbours means more guesses that read hot.*

Here is the top of the list, and it is not a close race.

| Country | Land neighbours |
|---|---|
| China | 16 |
| Russia | 14 |
| Brazil | 10 |
| DR Congo | 9 |
| Germany | 9 |
| Austria | 8 |
| France | 8 |
| Serbia | 8 |
| Tanzania | 8 |
| Türkiye | 8 |

**China touches 16 countries — nearly one in ten of everything in the pool.** Russia touches 14.

### Why these are the easiest answers in the game

Guess anywhere in Asia against a China answer and you will very likely land on one of those 16, which puts you in the hottest band immediately.

Combine that with size — China is enormous, so its centroid is close to a lot of things — and you get an answer that is almost impossible not to find in three or four guesses.

#### The one exception worth knowing

Serbia and Austria each have eight neighbours but are geographically tiny. They inherit the "easy to walk into" property from the neighbour count while keeping the "easy to overshoot" property from their size.

That combination puts them in an awkward middle band: reachable, but fiddly to pin down once you are close.

## The Shape of the Distribution

![Column chart of land-neighbour counts across all 176 countries](/blog/borders-and-landlocked-countries/fig-1-distribution.svg)

*Plate 1 - three quarters of the pool has between zero and five neighbours.*

Before the extremes, it is worth seeing the whole spread. Here is every country in the pool, grouped by how many land neighbours it has.

| Land neighbours | Countries |
|---|---|
| 0 | 23 |
| 1 | 15 |
| 2 | 25 |
| 3 | 29 |
| 4 | 24 |
| 5 | 26 |
| 6 | 14 |
| 7 | 9 |
| 8 | 6 |
| 9 | 2 |
| 10 | 1 |
| 14 | 1 |
| 16 | 1 |

### The middle is where the game lives

**Three-quarters of the pool has between zero and five land neighbours.** The long tail past six holds just 20 countries.

That matters for expectations. Most answers are moderately connected — enough of a trail to follow, not so much that the answer falls into your lap.

### The fifteen countries with exactly one neighbour

These are a category of their own, and an awkward one:

Brunei · Canada · Denmark · Dominican Republic · Gambia · Haiti · Ireland · Lesotho · Papua New Guinea · Portugal · Qatar · South Korea · Sri Lanka · Timor-Leste · United Kingdom

#### One neighbour is nearly as bad as none

Mean difficulty for this group is 4.00, against 4.30 for the zero-neighbour group and 3.56 for two. A single land border barely helps.

The reason is that one neighbour gives you one inward-pointing guess. Miss it, and you are back to searching by distance alone.

Lesotho is the extreme case: it is an enclave, entirely surrounded by South Africa. Its one neighbour is also its only possible approach.

## The 23 Countries With No Land Border

![Plate naming the 23 countries in the pool with no land border](/blog/borders-and-landlocked-countries/fig-4-no-borders.svg)

*Plate 4 - no chain of neighbours to follow inward.*

At the other extreme sit the countries you cannot walk into from anywhere.

Australia · Bahamas · Cuba · Cyprus · Falkland Islands · Fiji · French Southern and Antarctic Lands · Greenland · Iceland · Jamaica · Japan · Kosovo · Madagascar · N. Cyprus · New Caledonia · New Zealand · Philippines · Puerto Rico · Solomon Islands · Somaliland · Taiwan · Trinidad and Tobago · Vanuatu

That is 23 of 176 — **13% of the pool has no land neighbour at all.**

### Islands, and two that aren't

Most of the list is what you would expect: island states and island groups.

Two entries are not islands. Kosovo and N. Cyprus are disputed territories whose borders our dataset does not record as land borders, which is a data artefact rather than a geographic fact. Worth knowing so the list does not confuse you.

#### Why zero neighbours means no warm trail

With an island answer, a guess 400 km away across water reads almost exactly like a guess 400 km away across land. But there is no chain of adjacent countries to follow inward.

You have to find it more or less directly, which is why island nations dominate the [hardest countries list](/blog/hardest-countries-to-guess).

## Landlocked: 40 of Our 176

![Bar chart of landlocked countries by region, 16 in Africa and 12 in Asia](/blog/borders-and-landlocked-countries/fig-3-landlocked.svg)

*Plate 3 - the figure describes our 176-country pool, not the world.*

A landlocked country has land borders on every side and no coastline. In our pool there are 40.

### Where they cluster

| Region | Landlocked countries |
|---|---|
| Africa | 16 |
| Asia | 12 |
| Europe | 10 |
| Americas | 2 |

Africa carries the most, and they are concentrated: a belt running from Mali and Burkina Faso across Niger and Chad, then south through South Sudan, Uganda, Rwanda, Burundi, Zambia, Zimbabwe, Botswana and Malawi.

Central Asia holds a second dense block — Kazakhstan, Uzbekistan, Turkmenistan, Kyrgyzstan, Tajikistan, Afghanistan, Mongolia, Nepal, Bhutan.

Europe's ten are scattered through the middle: Austria, Belarus, Czechia, Hungary, Luxembourg, Moldova, North Macedonia, Serbia, Slovakia, Switzerland.

The Americas have exactly two: Bolivia and Paraguay.

### Doubly landlocked

Two countries in the world are landlocked *and* surrounded entirely by other landlocked countries: Liechtenstein and Uzbekistan. Neither can reach the sea without crossing at least two borders.

Uzbekistan is in our pool. Liechtenstein is not, which is worth knowing before you spend a guess on it.

#### Why our count is 40 and not the 44 you'll read elsewhere

Search for landlocked countries and you will find 44, [including on Wikipedia](https://en.wikipedia.org/wiki/Landlocked_country). That figure counts all 195 UN-recognised states.

Our pool holds 176 entries, chosen for playability rather than diplomacy. Four landlocked states in the standard count are not in it. **The 40 figure describes this game's answer pool, not the world.** If you are here for an atlas fact rather than a guessing edge, take the 44.

## Neighbour Count vs Difficulty: The Correlation

![Line chart showing mean difficulty falling from 4.30 to 1.67 as neighbour count rises](/blog/borders-and-landlocked-countries/fig-5-difficulty.svg)

*Plate 5 - monotonic across every step but the last.*

This is the part we did not expect to be so clean.

### The measurement

We rate every country 1 to 5 for difficulty, weighting land area 65% and neighbour count 35% — the same formula shown on every [answer page](/globle-answer-today). Then we grouped countries by neighbour count and took the mean difficulty of each group.

| Land neighbours | Countries | Mean difficulty |
|---|---|---|
| 0 | 23 | 4.30 |
| 1 | 15 | 4.00 |
| 2 | 25 | 3.56 |
| 3 | 29 | 3.03 |
| 4 | 24 | 2.92 |
| 5 | 26 | 2.77 |
| 6 | 14 | 2.00 |
| 7 | 9 | 1.67 |
| 8+ | 11 | 1.73 |

**Difficulty falls monotonically from 4.30 to 1.67 as neighbours rise from zero to seven.** Every single step down the table is a step easier, with one small reversal at the very end where the 8+ bucket ticks back up to 1.73.

### What the reversal at the top means

The 8+ group contains China and Russia, but also Serbia and Austria — small, heavily bordered European states.

Those two drag the group's mean up. It is the clearest evidence in the table that neighbour count is not the whole story; size still matters, which is exactly why the formula weights it more heavily.

#### An honest caveat

Neighbour count is one of the two inputs to the difficulty score, so some of this correlation is built in by construction rather than discovered.

What the table genuinely shows is the *shape*: the effect is smooth and monotonic rather than lumpy, and the gap between the extremes is large — a zero-neighbour country is two and a half difficulty points harder than a seven-neighbour one.

## Using Border Logic Mid-Game

The practical version is short.

### Before you guess: ask which kind of answer you want

You cannot choose the answer, but you can choose where to spend your early guesses. Aim them at the crowded interiors — Europe, central Africa, Central and South-East Asia — because that is where most of the pool lives.

Roughly 87% of countries have at least one land neighbour, and the connected ones cluster in exactly those regions. Opening into open ocean tests the 13% and ignores the rest.

### When a guess reads very hot

A hot reading next to a well-connected region means you are probably one country away, and there is a chain to follow. Guess inward along the chain.

A hot reading with nothing around it means you may be near an island. Stop walking and start naming candidates.

### When you are stuck in a cold band

Ask whether the cold region contains islands. Roughly one in eight answers has no land neighbour, and those are disproportionately the ones that leave you stuck.

### A worked example: Uganda

Uganda has five land neighbours and ranks 81st of 176 by area — mid-table on both counts, and our difficulty score puts it at 3 of 5.

Play it out. An opening guess in West Africa reads warm but not hot. A second guess in southern Africa reads warmer. You now know you are in the eastern interior.

From there the five neighbours do the work: Kenya, Tanzania, Rwanda, South Sudan and DR Congo are all common guesses, and any of them lands adjacent to the answer and reads hot.

Contrast that with Madagascar, which has the same rough size but zero neighbours. There is no chain. You either name it or you keep circling the Indian Ocean.

#### The landlocked tell

If your guesses in a region all read warm but none reads hot, you are likely circling a small landlocked country rather than a coastal one — the interior is where the small, easy-to-overshoot answers live.

Central Africa and Central Asia are where this happens most.

## The Full Landlocked List

For reference, the 40 landlocked countries in the pool:

Afghanistan · Armenia · Austria · Azerbaijan · Belarus · Bhutan · Bolivia · Botswana · Burkina Faso · Burundi · Central African Republic · Chad · Czechia · Eswatini · Ethiopia · Hungary · Kazakhstan · Kyrgyzstan · Laos · Lesotho · Luxembourg · Malawi · Mali · Moldova · Mongolia · Nepal · Niger · North Macedonia · Paraguay · Rwanda · Serbia · Slovakia · South Sudan · Switzerland · Tajikistan · Turkmenistan · Uganda · Uzbekistan · Zambia · Zimbabwe

### Two enclaves in the list

Lesotho is surrounded entirely by South Africa. Eswatini is nearly so — it has South Africa on three sides and Mozambique on the fourth.

Both are small, both are interior, and both are exactly the profile that catches players out: warm readings all around, no obvious way in.

## What This Study Can't Tell You

Three limits worth naming.

**Border counts are a dataset choice, not a fact of nature.** Disputed territories, maritime boundaries and non-recognised states all shift the numbers. Kosovo and N. Cyprus appear here with zero land borders, which is a recording convention rather than geography.

**Difficulty and neighbour count are not independent.** Neighbour count feeds the difficulty score, so part of the correlation is baked in. What the table shows is that the relationship is smooth and steep, not that it is causal in one direction.

**None of this tells you what the answer is.** It tells you what kind of answer you are hunting, which changes how you should hunt — walk the chain when there is one, name candidates when there is not.

## Frequently Asked Questions

<details>
<summary>Which country borders the most other countries?</summary>
<p>China, with 16 land neighbours, followed by Russia with 14 and Brazil with 10. In a distance-based guessing game these are among the easiest possible answers, because so many nearby guesses read hot and point inward.</p>
</details>

<details>
<summary>How many landlocked countries are there?</summary>
<p>The standard figure is 44 out of 195 UN member states. Our game pool holds 176 countries and territories, 40 of which are landlocked: 16 in Africa, 12 in Asia, 10 in Europe and 2 in the Americas.</p>
</details>

<details>
<summary>Which countries are doubly landlocked?</summary>
<p>Liechtenstein and Uzbekistan. Both are landlocked and surrounded entirely by other landlocked countries, so reaching the sea means crossing at least two borders. Only Uzbekistan appears in our answer pool.</p>
</details>

<details>
<summary>How many countries have no land borders?</summary>
<p>23 of the 176 in our pool, or about 13%. Most are island states such as Japan, Iceland, Madagascar and New Zealand. They are the hardest answers in the game because there is no chain of adjacent countries to follow toward them.</p>
</details>

<details>
<summary>Does having more neighbours make a country easier to guess?</summary>
<p>Yes, and measurably so. Mean difficulty falls from 4.30 for countries with no land neighbour to 1.67 for countries with seven, dropping at every step in between. More neighbours means more nearby guesses that read hot.</p>
</details>

---

**Method.** Neighbour counts and landlocked flags come from our 176-country dataset, derived from open data and refined for gameplay. Difficulty is the 1–5 score used across the site, weighting land-area rank 65% and neighbour count 35%. All figures are reproducible from `scripts/blog-data.mjs` in our repository.

Put it to work: [play Globle Unlimited](/), or see which countries this predicts will be hardest in [the hardest countries to guess](/blog/hardest-countries-to-guess).
