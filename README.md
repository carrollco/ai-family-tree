# Family Tree of AI

One interactive page, [index.html](index.html), that maps 40 people, works and ideas behind modern AI (from Turing's 1936 computing machines to language models that act) and the 64 documented links between them: who taught whom, who worked together, whose idea built on whose, which discovery came earlier, and which critique got an answer. Every name opens a panel with a description, its primary sources and its "Influenced by" and "Influenced" lists.

It merges two pages that AI chat tools generated for Carroll, kept unchanged in [originals/](originals/):

- [originals/ai-atlas.html](originals/ai-atlas.html), "AI Atlas · An interactive family tree" (dark theme, 22 milestones)
- [originals/family-tree-of-ai.html](originals/family-tree-of-ai.html), "Family Tree of AI" (light theme, 33 people and works)

The page is one self-contained file: inline CSS and JavaScript, no CDN, no external fonts, scripts or images. It works offline; only the source links need a network.

## How to open it

- Open `index.html` directly in a browser, or
- serve the folder and open the page over http:

  ```sh
  python3 -m http.server 8793 --bind 127.0.0.1 --directory /home/cagst/projects/ai-family-tree
  ```

  then go to http://127.0.0.1:8793/index.html and add a name to the address to open it, for example http://127.0.0.1:8793/index.html#hinton

## Features, and where each came from

| Feature | From |
|---|---|
| SVG graph with horizontal era bands, the main view | Tree |
| Click a name to open a side panel: description, "Influenced by" and "Influenced" lists with a one-line note per link, and a count of connected names | Tree |
| Lineage modes (Full lineage, Ancestors, Descendants) that dim everything outside the selected name's lineage | Tree |
| Five typed, colored connection kinds with checkbox toggles (teacher to student, worked together, built on the idea, earlier discovery, critique and answer); toggles also change what the lineage walk follows | Tree |
| Hover a connection to read its note | Tree; now also on keyboard focus, and on tap on a phone |
| Selection in the address (`#hinton`); old ids from both originals still work as aliases (`#rumelhart`, `#suttonbarto`, `#feifei`, `#deepmind`, `#symbolic`, `#feedback`, `#perceptron`) | Tree |
| Light theme | Tree (its dark-mode block was dropped) |
| Search box ("Search Hinton, self-play, Transformer…") over name, summary and description: matches are highlighted, the rest dimmed, Enter or a result click selects | Atlas (the result list and Enter-to-select are new) |
| Year slider ("Through 1990"): names and connections after the year are dimmed | Atlas |
| Topic chips (Foundations, Neural networks, Vision, Language, Reinforcement learning) | Atlas |
| Guided tour, 14 stops from Turing to models that act, with Next, Back, Exit and the arrow keys | Atlas (shortened from 18 stops, one or two sentences each) |
| Era names from both: Foundations; Perceptrons and the first winter; Backprop and connectionism; Scale and data; Sequences and play; Attention, then action | Both |
| Primary-source links per name, labelled with where they go ("Nature paper, 1986 ↗") | Atlas (every Atlas link kept), extended to the tree's names |
| The interaction-loop chips on "Models that act", and the "braided history" note | Atlas |
| Geoffrey Hinton quote card | New |
| Zoom (minus, Fit, plus), drag to pan, a bottom sheet instead of the side panel on a phone, collapsible filters on a phone, a "Browse every name as a list" view, a skip link | New |

Node shape gives the kind (pill: person, square corners: work, dashed border: idea) and the colored left edge gives the topic. Connection kinds differ by line pattern as well as color (solid thick, dash-dot, solid thin, dashed, dotted), so they stay distinguishable without color. The four connection colors and the five topic colors were checked with a palette validator for color-vision-deficiency separation; the gray "earlier discovery" line is neutral on purpose and carries a dashed pattern.

Accessibility: every name is a focusable button (Tab moves through names in date order, then through connections); Enter opens it; Escape closes the result list, exits the tour, or clears the selection; focus is visible; controls carry labels; motion is removed under `prefers-reduced-motion`. Clicking empty space in the map clears the selection.

## Data model

All data lives in one JSON block, `<script type="application/json" id="data">`, inside `index.html`:

- `nodes`: `id`, `name`, `kind` (person, work or idea), `year`, `era`, `topic` (one of the Atlas's five), `sub` (the box's second line), `who`, `summary` (one line), `description`, `sources` (a list of `{label, url}`), `pos` (`row` within the era band and `x`), and optionally `quote` and `loop`.
- `edges`: `from`, `to`, `type` (one of the five kinds) and `note`.
- `eras`, `topics`, `types`, `tour`, `aliases`.

Box positions were found by a small layout search (minimize lines passing behind boxes, line crossings and horizontal distance, keep earlier years above later ones within a band). At load the page also bends any line that would pass behind an unrelated box around it through the free gap beside that box, and spreads the ends of several lines on one box so their arrowheads do not pile up.

## Fact check

Both originals were generated by AI chat tools, so every year, description and connection note was checked against the knowledge of the model that built this page and, wherever it was uncertain or the claim was load-bearing, against primary or authoritative sources fetched on 7 October 2026 (papers, publisher pages, award announcements, authors' and institutions' own pages; Wikipedia only as a pointer). Every URL in the page returned HTTP 200 or a normal redirect, with the exceptions noted under "Link notes" below.

### Corrections made against the originals

| Original claim (where) | Merged page now says | Source |
|---|---|---|
| Edge Hopfield to Hinton: "Boltzmann machines (1985) added noise and hidden units to Hopfield nets" (Tree). Reads as if the 1985 date and the invention were one event and leaves out the co-inventors | Hinton used the Hopfield network as the foundation for the Boltzmann machine, invented with Terrence Sejnowski (1983); their learning-algorithm paper with David Ackley appeared in 1985 | https://www.nobelprize.org/prizes/physics/2024/press-release/ ; https://awards.acm.org/about/2018-turing ; https://www.cs.toronto.edu/~hinton/absps/cogscibm.pdf |
| Hinton: "co-inventor of Boltzmann machines (1985)" (Tree) | Invented with Sejnowski in 1983; learning algorithm published with Ackley and Sejnowski in Cognitive Science 9, 1985 | same as above |
| Edge Hinton to AlexNet, teacher to student: "Krizhevsky and Sutskever were Hinton's PhD students" (Tree) | Worked together: "Hinton co-authored AlexNet with his students Krizhevsky and Sutskever". Sutskever's Toronto PhD with Hinton is verified (thesis 2013) and has its own teacher-to-student link; Krizhevsky's degree level could not be verified, so he is called a student, as ACM does | https://awards.acm.org/about/2018-turing ; https://www.cs.utoronto.ca/~ilya/pubs/ilya_sutskever_phd_thesis.pdf ; https://www.cs.toronto.edu/~hinton/pages/students/phds.html |
| Sutton & Barto card dated 1988, "Learning from actions and consequences" (Atlas); "Sutton & Barto, 1988 · TD learning" (Tree). The 1988 milestone reads as joint | The 1988 temporal-difference paper is by Sutton alone; with Charles Anderson they introduced actor-critic learning in 1983; their textbook is 1998 (second edition 2018); Barto supervised Sutton's 1984 PhD; 2024 ACM Turing Award confirmed | https://doi.org/10.1007/BF00115009 ; http://incompleteideas.net/book/the-book-2nd.html ; https://awards.acm.org/about/2024-turing |
| Werbos: "His Harvard PhD thesis proposed training multilayer networks by propagating errors backward" (Tree) | The 1974 thesis developed backward propagation of derivatives and discussed neural networks briefly; his 1982 paper applied it to neural networks explicitly; historians disagree on how much the thesis contained | https://people.idsia.ch/~juergen/who-invented-backpropagation.html ; https://doi.org/10.1007/BFb0006203 |
| Linnainmaa: "His master's thesis described reverse-mode automatic differentiation", 1970 (Tree) | Confirmed, with context: the 1970 University of Helsinki thesis was in Finnish, aimed at rounding errors rather than networks, and published in English in 1976 | https://ems.press/books/dms/251/4949 ; https://doi.org/10.1007/BF01931367 |
| LSTM: "Hochreiter's 1991 thesis, supervised by Schmidhuber" and LSTM "ruled sequence modeling until transformers arrived" (Tree) | A 1991 diploma thesis at TU Munich, advised by Schmidhuber; LSTMs "became the leading sequence models until Transformers spread after 2017" | https://people.idsia.ch/~juergen/fundamentaldeeplearningproblem.html ; https://doi.org/10.1162/neco.1997.9.8.1735 |
| Edge Turing to Shannon, worked together: "Met at Bell Labs in 1943 and talked about thinking machines" (Tree) | Built on the idea: they met and talked in 1943 but did not work together (Turing's work there was secret); Shannon later published "A Universal Turing Machine with Two Internal States" (1956) | Shannon, "A Universal Turing Machine with Two Internal States", Automata Studies (Princeton University Press, 1956), pp. 157 to 165, confirmed from bibliographic records (the publisher page blocks automated access, so no link); the 1943 meeting from Hodges' and Gleick's accounts |
| LeCun: LeNet-5 "read a large share of US bank checks" (Tree) | A check-reading system he helped develop read "an estimated 10 percent of all the checks written in the US" | http://yann.lecun.com/ |
| Edge LeCun to Bengio, worked together: "Colleagues at AT&T Bell Labs in the early 1990s" (Tree) | Teacher to student: Bengio was a postdoc in LeCun's group at Bell Labs, 1992 to 1993; they co-wrote the 1998 LeNet-5 paper | http://yann.lecun.com/ (former postdocs list) ; http://yann.lecun.com/exdb/lenet/ ; https://awards.acm.org/about/2018-turing |
| Edge Rumelhart to Bengio: "Backprop-trained networks were the core of Bengio's work from his 1991 PhD on" (Tree) | Replaced by a sourced link: Bengio, Simard and Frasconi (1994) showed why gradient descent struggles to learn long-range dependencies. The 1991 PhD date was not verified and is left out | https://doi.org/10.1109/72.279181 (checked, not linked in the page) |
| Edge Widrow to Rumelhart: "The 1986 paper called backprop the generalized delta rule" (Tree) | The phrase is attributed to the PDP chapter "Learning internal representations by error propagation" (1986), where it was verified ("a clear generalization of the delta rule. We call this the generalized delta rule"); whether the Nature letter also uses it was not checked | https://cs.uwaterloo.ca/~y328yu/classics/bp.pdf |
| Edge Bengio to Attention, teacher to student: "Written in Bengio's lab in Montreal" (Tree) | Worked together: "Bengio co-authored the attention paper with Bahdanau and Cho" (Bahdanau's listed affiliation is Jacobs University Bremen; "written in his lab" was not verified) | https://arxiv.org/abs/1409.0473 ; https://awards.acm.org/about/2018-turing |
| Bengio's 2003 model is "the direct ancestor of today's language models" (Tree) | "An important ancestor"; also notes the NIPS 2000 version and the JMLR co-authors | https://www.jmlr.org/papers/v3/bengio03a.html |
| Hebb: "Nearly every learning rule since is a refinement of that idea" (Tree) | "Many later learning rules ... are refinements of that idea" | none needed (overclaim removed) |
| Perceptrons (book) "helped steer funding toward symbolic AI for more than a decade" (Tree) | "Often blamed for a decade of reduced interest and funding, though historians still debate how large its effect was"; the proofs concern parity (XOR is its two-input case) and connectedness | none needed (hedged) |
| Minsky: "SNARC and Minsky's PhD work built networks of McCulloch-Pitts neurons" (Tree) | "Explored networks of artificial neurons in their tradition"; the 1954 thesis discussed reinforcement learning and SNARC | http://incompleteideas.net/book/the-book-2nd.html (history section, chapter 1.7) |
| Node "DeepMind, 2015 · DQN, AlphaGo" and edge "David Silver did his PhD under Sutton" from Sutton & Barto to DeepMind (Tree) | Split into DQN (2015), AlphaGo (2016) and a David Silver node; Silver's 2009 Alberta PhD with Sutton is verified; Silver co-authored DQN and was first author of AlphaGo and AlphaZero | http://incompleteideas.net/papers/Silver-phd-thesis.pdf ; https://doi.org/10.1038/nature14236 ; https://doi.org/10.1038/nature16961 ; https://arxiv.org/abs/1712.01815 |
| Edge DeepMind to ChatGPT: "RLHF came from a 2017 OpenAI and DeepMind paper" (Tree) | Confirmed and given its own node, "RL from human preferences" (Christiano, Leike, Brown, Martic, Legg, Amodei, 2017), linked from Sutton & Barto and into ChatGPT | https://arxiv.org/abs/1706.03741 |
| AlphaFold 2: Nobel share for Hassabis and Jumper (Tree) | Confirmed; adds the third laureate, David Baker | https://www.nobelprize.org/prizes/chemistry/2024/summary/ |
| ChatGPT "release in late 2022" (Tree) | Released 30 November 2022, fine-tuned from a GPT-3.5 model, a sibling of InstructGPT | https://openai.com/index/chatgpt/ ; https://arxiv.org/abs/2203.02155 |
| Hubel & Wiesel, Nobel Prize in Medicine 1981 (Tree) | Confirmed; shared with Roger Sperry | https://www.nobelprize.org/prizes/medicine/1981/summary/ |
| LeNet link `https://yann.lecun.com/exdb/lenet/` (Atlas) | HTTPS refused the connection; the same page at http://yann.lecun.com/exdb/lenet/ returns 200 and is used | http://yann.lecun.com/exdb/lenet/ |
| "Information & feedback" card (Shannon, Wiener, von Neumann, 1948) with a link to reinforcement learning, no source (Atlas) | Folded into the Shannon node (Wiener and von Neumann named as parallel roots); the link to reinforcement learning is now sourced: Sutton and Barto's history credits Shannon's maze-learning mouse Theseus (1952) and his self-improving chess evaluation idea | http://incompleteideas.net/book/the-book-2nd.html |
| "The environment matters", 2024, no source, with a sentence about controller experiments (Atlas) | Renamed "Learning from experience", dated 2025 and sourced to Silver and Sutton's "Welcome to the Era of Experience"; the controller-experiment sentence was project advice, not history, and was removed | https://storage.googleapis.com/deepmind-media/Era-of-Experience%20/The%20Era%20of%20Experience%20Paper.pdf |

Checked and found correct as stated (kept): the 1986 backprop paper (Rumelhart, Hinton, Williams, Nature 323, 533 to 536, 9 October 1986); LSTM (Hochreiter and Schmidhuber, Neural Computation, 1997); Bengio's neural language model (JMLR 3, 2003); AlexNet's authors (Krizhevsky, Sutskever, Hinton), two GPUs, 1.2 million training images, 15.3 against 26.2 percent top-5 error; Sutskever as Hinton's doctoral student; LeCun's Toronto postdoc with Hinton, 1987 to 1988 (ACM profile and Hinton's postdoc list); Hinton's 2018 ACM Turing Award with Bengio and LeCun and his 2024 Nobel Prize in Physics with John Hopfield; McCulloch and Pitts' Turing-machine claim (1943); the Dartmouth proposal's four authors (31 August 1955); Rosenblatt and Minsky at the Bronx High School of Science a year apart; the Neocognitron learning "without a teacher"; word2vec's king, man, woman, queen example; ResNet's 152 layers and ILSVRC 2015 win; the eight Transformer authors; GPT-1's four authors; BERT's four authors; AlphaGo's 5 to 0 against Fan Hui and 4 to 1 against Lee Sedol; AlphaZero learning from the rules alone (preprint 2017, Science 2018); ReAct (Yao and colleagues, 2022).

### Not verified, left out or softened

- Bengio's 1991 PhD date (Tree): left out.
- Krizhevsky as a PhD student (Tree): not on Hinton's list of completed PhDs; the page says "student".
- That the attention paper was "written in Bengio's lab" (Tree): replaced by co-authorship.
- MIT's AI Project founding year, 1959 (Tree): kept; supported by the Computer History Museum and Britannica, not by an MIT primary source.
- No source link is given for Hebb (1949) or Perceptrons (1969): both are books, the publisher pages refuse automated requests, and no verified open copy was found. Their panels say so.
- Statements from general knowledge that were not separately fetched: Shannon's 1937 master's thesis on relay circuits, McCarthy's Lisp, Rosenblatt's Mark I Perceptron, SNARC's 1951 date, Wiener's 1948 Cybernetics.

### Link notes

- https://doi.org/10.1162/neco.1997.9.8.1735 (LSTM, from the Atlas): the DOI redirects normally to MIT Press, which answers automated clients (curl and headless Chromium) with a bot check, so the landing page itself could not be loaded here. A second LSTM source, the paper PDF at JKU Linz, is linked beside it.
- ACM award pages, Oxford Academic (Mind), Science, OpenAI and IEEE Xplore refuse curl but loaded in headless Chromium during the check.

## The quote

Geoffrey Hinton's panel carries this quote card:

> "It's a trillion real numbers and nobody quite knows how they work."

Geoffrey Hinton on StarTalk, "Is AI Hiding Its Full Power? With Geoffrey Hinton" (28 February 2026), at 52:01: https://www.youtube.com/watch?v=l6ZcFa8pybE&t=3121s

The wording comes from the video's auto-generated English captions, where the line starts at 52:01.9 after a speaker change. The title, the StarTalk channel and the upload date (28 February 2026) were read from the video's YouTube metadata.

A second real quote sits on Backpropagation: Hinton on StarTalk at 1:16:32, correcting a host who credited AI to his own work, "In particular, the back propagation algorithm was reinvented by David Rumelhart" (https://www.youtube.com/watch?v=l6ZcFa8pybE&t=4590s). Both quotes' wording comes from the video's original English captions; the speaker is as labeled in The Singju Post's transcript (https://singjupost.com/is-ai-hiding-its-full-power-w-geoffrey-hinton-transcript/), which agrees with the captions' turn order. The quote card's heading is "A real quote", since the speaker is not always the person the entry is about.

## originals/

[originals/](originals/) holds the two source pages unchanged.

Made by Carroll Guertin.

## Checks

`checks/verify.mjs` drives the page in headless Chromium at 390 and 1280 px wide (42 checks: no
errors, no sideways scrolling, search, lineage modes, link toggles, the year slider, the guided tour,
deep links, the quote cards, and that every link is one of `checks/verified-urls.txt`). Serve the
folder on port 8793 (`python3 -m http.server 8793 --bind 127.0.0.1`), then `cd checks && node
verify.mjs`; it needs Playwright, and screenshots go to `tmp/`.
