/**
 * 🎯 BombAnime - Character Variants
 * 
 * Chaque anime contient des groupes de variantes.
 * Quand un joueur cite un nom, on bloque TOUS les noms du groupe.
 * 
 * Structure: { anime: [ [variante1, variante2, ...], [autre_perso1, autre_perso2], ... ] }
 */

const CHARACTER_VARIANTS = {
    
    // ============================================
    // DRAGON BALL
    // ============================================
    "Dbz": [
        ["GOKU", "SON GOKU", "SONGOKU", "KAKAROT", "BLACK GOKU"],
        ["TORTUE GENIAL", "MUTEN ROSHI", "ROSHI"],
        ["GOHAN", "SON GOHAN", "SONGOHAN"],
        ["GOTEN", "SON GOTEN", "SONGOTEN"],
        ["FREEZER", "FRIEZA"],
        ["BUU", "BOO", "MAJIN BOO", "MAJIN BUU"],
        ["HERCULE", "SATAN", "MISTER SATAN", "MR SATAN"],
        ["C17", "C 17", "C-17", "LAPIS"],
        ["C18", "C 18", "C-18", "LAZULI"],
        ["C16", "C 16", "C-16"],
        ["C19", "C 19", "C-19"],
        ["C20", "C 20", "C-20", "GERO", "DR GERO"],
        ["C21", "C 21", "C-21"],
        ["C8", "C 8", "C-8"],
        ["C13", "C 13", "C-13"],
        ["C14", "C 14", "C-14"],
        ["C15", "C 15", "C-15"],
        ["BACTERIAN", "BACTERIE"],
        ["GINYU", "GINYUU" , "GINUE"],
        ["KRILIN", "KRILLIN"],
        ["KIWI", "CUI"],
        ["PUAR", "PLUME"],
        ["POPO", "MR POPO", "MISTER POPO"],
        ["ZABON", "ZARBON"],
        ["PUI PUI", "PUIPUI"],
        ["DORIA", "DODORIA"],
        ["PIKKON", "PAIKUHAN"],
        ["LANFAN", "RANFAN"],
        ["BARTA", "BURTER"],
        ["KAFLA", "KEFLA"],
        ["CAULIFLA", "CAULIFA"],
        ["NAM", "NAMU"],
        ["TAO PAI PAI", "TAOPAIPAI"],
        ["SAIBAMAN", "SAIBAIMAN"],
        ["RECOME", "RECOOME" , "RECOOM" , "REACUM" , "REECOM"],
        ["BARDOCK", "BADDACK"],
        ["CHICHI", "CHI CHI"],
        ["SPOPOVITCH", "SPOPOVICH"],
        ["DABRA", "DABURA"],
        ["KAIOBITO", "KIBITOSHIN"],
        ["UUB", "OOB"],
        ["SLUG", "SLUGG"],
        ["THALES", "TURLES"],
        ["JANEMBA", "JANENBA"],
        ["JEECE", "JEICE", "JEESE"],
    ],

    // ============================================
    // NARUTO
    // ============================================
    "Naruto": [
        ["JIRAYA", "JIRAIA", "JIRAIYA"],
        ["ICHIBI", "SHUKAKU"],
        ["KILLER B", "KILLER BEE"],
        ["NIBI", "MATATABI"],
        ["SANBI", "ISOBU"],
        ["ADA", "EIDA"],
        ["SON GOKU", "YONBI"],
        ["GOBI", "KOKUO"],
        ["SAIKEN", "ROKUBI"],
        ["NANABI", "CHOMEI"],
        ["GYUKI", "HACHIBI"],
        ["KURAMA", "KYUBI"],
    ],

    // ============================================
    // ONE PIECE
    // ============================================
    "OnePiece": [
        ["LUFFY", "MONKEY D LUFFY", "MONKEY D. LUFFY"],
        ["ZORO", "ZORO RORONOA"],
        ["SANJI", "SANJI VINSMOKE"],
        ["NAMI"],
        ["USOPP"],
        ["CHOPPER", "TONY TONY CHOPPER"],
        ["ROBIN", "NICO ROBIN"],
        ["FRANKY"],
        ["BROOK"],
        ["JINBE", "JINBEI"],
        ["LUCKY ROO", "LUCKY ROUX"],
        ["BEN BECKMAN", "BENN BECKMAN"],
        ["AOKIJI", "KUZAN"],
        ["KIZARU", "BORSALINO"],
        ["FUJITORA", "ISSHO"],
        ["COBY" , "KOBBY" , "KOBY"],
        ["RYOKUGYU", "ARAMAKI"],
        ["BELL MERE", "BELLMERE"],
        ["BIG MOM", "CHARLOTTE LINLIN", "LINLIN"],
        ["BARBE NOIRE", "TEACH", "MARSHALL D TEACH", "BLACKBEARD"],
        ["BARBE BLANCHE", "WHITEBEARD", "EDWARD NEWGATE", "NEWGATE"],
        ["BAGGY", "BUGGY"],
        ["CAESAR", "CAESAR CLOWN", "CESAR", "CESAR CLOWN"],
        ["CHOUCHOU", "SHUSHU"],
        ["ENER", "ENERU"],
        ["IMU", "IM"],
        ["SAINT SHEPHERD JU PETER" , "PETER" , "JUPITER"],
        ["JABRA", "JABURA"],
        ["AKAINU", "SAKAZUKI"],
        ["CORAZON", "DONQUIXOTE ROSINANTE", "ROSINANTE"],
        ["GOLD ROGER", "GOL D ROGER", "GOL D. ROGER"],
        ["JAGUAR D SAUL", "JAGUAR D. SAUL" , "SAURO" , "JAGUAR D SAURO"],
        ["MORGE", "MOHJI"],
        ["NYON", "GLORIOSA"],
        ["SHAKKY", "SHAKUYAKU"],
        ["EMETH" , "EMET"],
        ["THATCH", "SATCH"],
        ["MONKEY D DRAGON", "MONKEY D. DRAGON"],
        ["MONKEY D GARP", "MONKEY D. GARP"],
        ["PORTGAS D ACE", "PORTGAS D. ACE"],
        ["PORTGAS D ROUGE", "PORTGAS D. ROUGE"],
        ["MR 1", "DAZ BONEZ", "DAZ BONES"],
        ["MR 2", "BON CLAY"],
        ["MR 3", "GALDINO"],
        ["SHIRYU", "SHILEW"],
        ["VIOLA", "VIOLET"],
        ["T BONE", "T-BONE", "T. BONE"],
        ["TRAFALGAR LAW", "TRAFALGAR D WATER LAW", "TRAFALGAR D. WATER LAW"],
        ["ZEPHYR", "Z"],
        ["LAFITTE" , "LAFFITTE"],
        ["ICEBERG", "ICEBURG"],
        ["HATCHAN", "OCTO", "HACHI"],
        ["CAPITAINE JOHN", "CAPTAIN JOHN", "JOHN"],
        ["ROCKS D XEBEC", "XEBEC", "ROCKS"],
        ["OARS", "OARS JR", "OZ", "OZ JR"],
        ["KOHZA", "KOZA"],
        ["KASHII" , "KASHI"],
        ["JOZU", "JOZ"],
        ["MARGARET", "MARGUERITE"],
        ["KAIDO", "KAIDOU"],
        ["SQUARD", "SQUARDO"],
        ["JACKSONBANNER", "JACKSON"],
        ["CHADROS HIGELYGES", "BARBE BRUNE", "CHAHIGE"],
        ["KIKU", "O KIKU", "KIKUNOJO"],
        ["KOMURASAKI", "KOZUKI HIYORI", "HIYORI"],
        ["SHUTENMARU", "ASHURA DOJI", "DOJI"],
        ["HYOGORO", "HYOUGOROU", "HYOGOROU"],
        ["KYOSHIRO", "KYOUSHIROU", "DENJIRO"],
        ["KILLER", "KAMAZOU"],
    ],

    // ============================================
    // HUNTER X HUNTER
    // ============================================
    "HunterXHunter": [
        ["GON FREECS", "GON FREECSS"],
        ["GING FREECS", "GING FREECSS"],
        ["MITO FREECS", "MITO FREECSS"],
        ["ABE FREECS", "ABE FREECSS"],
        ["KILLUA", "KIRUA", "KILLUA ZOLDYCK", "KIRUA ZOLDYCK", "KILLUA ZOLDIK", "KIRUA ZOLDIK"],
        ["ILLUMI", "IRUMI", "ILLUMI ZOLDYCK", "IRUMI ZOLDYCK", "ILLUMI ZOLDIK", "IRUMI ZOLDIK"],
        ["MILLUKI", "MIRUKI", "MILLUKI ZOLDYCK", "MIRUKI ZOLDYCK", "MILLUKI ZOLDIK", "MIRUKI ZOLDIK"],
        ["ALLUKA", "ARUKA", "ALLUKA ZOLDYCK", "ARUKA ZOLDYCK", "ALLUKA ZOLDIK", "ARUKA ZOLDIK"],
        ["KALLUTO", "KARUTO", "KALLUTO ZOLDYCK", "KARUTO ZOLDYCK", "KALLUTO ZOLDIK", "KARUTO ZOLDIK"],
        ["ZENO ZOLDIK", "ZENO ZOLDYCK"],
        ["SILVA ZOLDIK", "SILVA ZOLDYCK"],
        ["KIKYO ZOLDIK", "KIKYO ZOLDYCK"],
        ["MAHA ZOLDIK", "MAHA ZOLDYCK"],
        ["ZZIGG ZOLDIK", "ZZIGG ZOLDYCK"],
        ["UVOGIN", "UVOGUINE"],
        ["PEGGY", "PEGUI"],
        ["TOMPA", "TONPA"],
        ["LEORIO", "LEOLIO", "LEOLIO PARADINAITO"],
        ["MELEOLON", "MELEORON"],
        ["BUROVUTA", "BLOSTER"],
        ["POUF", "SHAIAPOUF" , "PUFU"],
        ["YUPI", "YOUPI", "MONTUTYUPI"],
        ["KURORO", "KURORO LUCIFER", "CHROLLO", "CHROLLO LUCILFER"],
        ["CANARY", "KANARIA"],
        ["PITOU", "PITO", "NEFERUPITO", "NEFERPITOU"],
        ["KNOV", "NOVU"],
        ["KITE", "KAITO"],
        ["POKKLE", "POKKURU"],
        ["SHALNARK", "SHARNALK"],
        ["TZESUGERA", "TSEZUGERA"],
        ["LIST", "RIST"],
        ["CLUCK", "KURUKKU"],
        ["GEL", "GELU"],
        ["NICOLAS", "NICOLA"],
        ["MOREL", "MOREL MCCARNATHY", "MORAU", "MORAU MCCARNATHY"],
        ["PAM", "PAM SHIBERIA", "PAMU", "PAMU SHIBERIA", "PALM"],
        ["SPIN", "SPIN CRO", "SPINNER", "SPINNER CLOW"],
    ],

    // ============================================
    // ATTAQUE DES TITANS
    // ============================================
    "Snk": [
        ["EREN JAGER", "EREN YEAGER", "EREN JAEGER"],
        ["CARLA JAGER", "CARLA YEAGER", "CARLA JAEGER"],
        ["GRISHA JAGER", "GRISHA YEAGER", "GRISHA JAEGER"],
        ["ZEKE", "ZEKE JAGER", "ZEKE YEAGER", "ZEKE JAEGER", "SIEG", "SIEG JAGER", "SIEG YEAGER", "SIEG JAEGER"],
        ["FAYE JAGER", "FAYE YEAGER", "FAYE JAEGER"],
        ["ARMIN ARLELT", "ARMIN ARLERT"],
        ["GABY", "GABY BRAUN", "GABI", "GABI BRAUN"],
        ["PIECK", "PIECK FINGER", "PEAK", "PEAK FINGER"],
        ["FLOCH", "FLOCH FORSTER", "FROCK", "FROCK FORSTER"],
        ["HANGE", "HANGE ZOE", "HANSI", "HANSI ZOE", "HANJI", "HANJI ZOE"],
        ["CONNY", "CONNY SPRINGER", "CONNIE", "CONNIE SPRINGER"],
        ["DINA", "DINA FRITZ", "DINAH", "DINAH FRITZ"],
        ["LEVI", "LIVAI"],
        ["BERTHOLT HOOVER", "BERTHOLT" , "BERTOLT"],
        ["JELENA", "YELENA"],
        ["KING FRITZ", "ROI FRITZ"],
        ["CHRISTA", "CHRISTA LENZ", "HISTORIA", "HISTORIA REISS"],
    ],

    // ============================================
    // POKEMON
    // ============================================
    "Pokemon": [
        ["HO-OH", "HO OH"],
        ["PORYGON-Z", "PORYGON Z"],
        ["LANCE", "PETER"],
        ["ASH", "SACHA"],
    ],

    // ============================================
    // BLEACH
    // ============================================
    "Bleach": [
        ["KUROSAKI ICHIGO", "ICHIGO KUROSAKI"],
        ["KUROSAKI ISSHIN", "ISSHIN KUROSAKI"],
        ["RENJI ABARAI", "ABARAI RENJI"],
        ["URAHARA", "KISUKE"],
        ["YAMAMOTO", "GENRYUSAI"],
        ["INOUE ORIHIME", "ORIHIME INOUE", "INOUE", "ORIHIME"],
        ["SADO YASUTORA", "SADO", "CHAD"],
        ["ISHIDA URYU", "URYU ISHIDA", "ISHIDA", "URYU"],
        ["HITSUGAYA TOSHIRO", "TOSHIRO HITSUGAYA", "HITSUGAYA", "TOSHIRO"],
        ["SHINJI HIRAKO", "HIRAKO SHINJI", "SHINJI", "HIRAKO"],
        ["RANGIKU MATSUMOTO", "MATSUMOTO RANGIKU", "MATSUMOTO", "RANGIKU"],
        ["UCHIDA HACHIGEN", "UCHIDA", "HACHI", "HACHIGEN"],
        ["ICHIMARU GIN", "GIN ICHIMARU"],
        ["SHIBA KAIEN", "KAIEN SHIBA"],
        ["APACHE", "APACCI"],
        ["KIRINJI", "TENJIRO"],
        ["KIRIO", "HIKIFUNE"],
        ["ULQUIORRA SCHIFFER", "ULQUIORRA CIFER"],
        ["BAZZARD BLACK", "BAZZ B", "BAZZ-B"],
        ["SUNG SUN", "SUNG-SUN" , "SUN SUN"],
        ["ROI DES ESPRITS", "ROI SPIRITUEL", "SOUL KING"],
        ["SZAYELAPORRO GRANDZ", "SZAYELAPORRO", "SZAYEL"],
        ["NELLIEL TU ODELSCHWANCK", "NELLIEL", "NEL", "NEL TU"],
        ["PESSHE GATIISHE", "PESCHE GUATICHE", "PESCHE", "PESSHE"],
        ["TIER HARRIBEL", "TIA HALLIBEL", "HALLIBEL", "HARRIBEL", "HALIBEL"],
    ],

    // ============================================
    // DEMON SLAYER
    // ============================================
    "DemonSlayer": [
        ["KAMADO TANJIRO", "TANJIRO KAMADO"],
        ["KAMADO NEZUKO", "NEZUKO KAMADO"],
        ["UBUYASHIKI", "KAGAYA UBUYASHIKI" , "KAGAYA"],
        ["AGATSUMA ZENITSU", "ZENITSU AGATSUMA"],
        ["HASHIBIRA INOSUKE", "INOSUKE HASHIBIRA"],
    ],

    // ============================================
    // GINTAMA
    // ============================================
    "Gintama": [
        ["GINTOKI SAKATA", "SAKATA GINTOKI"],
        ["HIJIKATA TOSHIRO", "HIJIKATA TOUSHIROU"],
        ["KATSURA KOTAROU", "KATSURA" , "ZURA"],
        ["KYUUBEI YAGYUU", "KYUBEI" , "KYUUBEI"],
        ["HASEGAWA TAIZOU", "HASEGAWA" , "MADAO"],
        ["TAE SHIMURA", "TAE" , "OTAE"],
        ["AYAME SARUTOBI", "AYAME" , "SACCHAN"],
        ["KONDOU ISAO", "KONDOU" , "KONDO"],
        ["TSUU TERAKADO", "TSUU" , "OTSU" , "OTSUU"],
        ["AYANO TERADA", "AYANO" , "OTOSE"],
        ["SHIGESHIGE TOKUGAWA", "SHIGE SHIGE" , "SHIGE" , "SHIGESHIGE"],
        ["YOSHIDA SHOYO", "YOSHIDA SHOYOU" , "SHOYO" , "SHOUYOU" , "YOSHIDA"],
        ["HATTORI ZENZOU", "ZENZO", "ZENZOU", "HATTORI"],
        ["OKITA SOUGO", "OKITA SOGO" , "SOUGO" , "SOGO"],
        ["UMIBOZU", "KANKOU"],
        ["GEDOUMARU", "GEDOMARU"],
        ["TENDOU", "TENDO"],
        ["JII", "JI"],
        ["TAKA CHIN", "TAKAYA"],
        ["TOKUMORI SAIGOU", "SAIGOU" , "SAIGO"],
        ["NEPTUNE SHOUHAKU", "SHOUHAKU" , "SHOHAKU"],
        ["YAGYUU", "YAGYU"],
        ["ENSHOU", "ENSHO"],
        ["NOBUNOBU HITOTSUBASHI", "NOBUNOBU" , "NOBU NOBU"],
        ["TERADA TATSUGOROU", "TATSUGOROU" , "TATSUGORO"],
        ["KOZENIGATA", "HEIJI"],
        ["AYUMU TOUJOU", "TOUJOU" , "TOJO"],
        ["ITOU", "ITO"],
        ["KETSUBO ANA", "KETSUBO CRYSTEL" , "ANA" , "CRYSTEL"],
        ["JIROCHOU", "JIROCHO"],
        ["SASAKI ISABUROU", "ISABURO" , "SASAKI" , "ISABUROU"],
        ["SHIMARU SAITOU", "SAITOU" , "SAITO"],
        ["KAMADO", "TANJIRO"],
        ["KAMADO", "TANJIRO"],
        ["KAMADO", "TANJIRO"],
        ["KAMADO", "TANJIRO"],
        ["KAMADO", "TANJIRO"],
        ["KAMADO", "TANJIRO"],
        ["KAMADO", "TANJIRO"]
    ],

    // ============================================
    // MANGANIME
    // ============================================
    "Manganime": [
        ["DRAGON BALL" , "DB" , "DRAGONBALL", "DRAGON BALL Z" , "DBZ" , "DRAGONBALL Z"],
        ["DBGT" , "DRAGONBALL GT" , "DRAGON BALL GT"],
        ["DBSUPER" , "DRAGONBALL SUPER" , "DRAGON BALL SUPER"],
        ["DBDAIMA" , "DRAGON BALL DAIMA" , "DRAGONBALL DAIMA"],
        ["FMA" , "FULLMETAL ALCHEMIST" , "FMAB" , "FULLMETAL ALCHEMIST BROTHERHOOD"],
        ["L'ATTAQUE DES TITANS" , "SHINGEKI NO KYOJIN" , "SNK" , "ATTACK ON TITAN" , "AOT" , "ATTAQUE DES TITANS"],
        ["HUNTER HUNTER" , "HXH" , "HUNTER X HUNTER"],
        ["GTO" , "GREAT TEACHER ONIZUKA"],
        ["BATTLE ANGEL ALITA" , "GUNNM"],
        ["HARUKANA MACHI E" , "QUARTIER LOINTAIN"],
        ["BOKU NO HERO ACADEMIA" , "MY HERO ACADEMIA" , "BNHA" , "MHA"],
        ["JOJO NO KIMYOU NA BOUKEN" , "JOJO" , "JOJO'S BIZARRE ADVENTURE" , "JOJOS BIZARRE ADVENTURE" , "JJBA"],
        ["THE JOJOLANDS" , "JOJOLAND" , "JOJOLANDS"],
        ["OPM" , "ONE PUNCH MAN"],
        ["BONNE NUIT PUNPUN" , "OYASUMI PUNPUN"],
        ["NAUSICAA" , "NAUSICAA DE LA VALLÉE DU VENT" , "KAZE NO TANI NO NAUSICAA"],
        ["NICKY LARSON" , "CITY HUNTER"],
        ["MEITANTEI CONAN" , "DETECTIVE CONAN" , "CONAN" , "CASE CLOSED"],
        ["RURONI KENSHIN" , "KENSIN LE VAGABOND" , "SAMURAI X" , "KENSHIN"],
        ["ANSATSU KYOUSHITSU" , "ANSATSU KYOSHITSU" , "ASSASSINATION CLASSROOM"],
        ["LES CHEVALIERS DU ZODIAQUE" , "CHEVALIERS DU ZODIAQUE" , "SAINT SEIYA"],
        ["KEN LE SURVIVANT" , "HOKUTO NO KEN" , "FIST OF THE NORTH STAR"],
        ["BLAME" , "BLAME!"],
        ["THE PROMISED NEVERLAND" , "YAKUSOKU NO NEVERLAND" , "TPN"],
        ["KIMETSU NO YAIBA" , "DEMON SLAYER" , "KNY"],
        ["JUJUTSU KAISEN" , "JJK"],
        ["EVA" , "NEON GENESIS EVANGELION" , "EVANGELION" , "SHIN SEIKI EVANGELION" , "NGE"],
        ["D GRAY MAN" , "DGRAYMAN"],
        ["MUGEN NO JUNIN" , "L'HABITANT DE L'INFINI"],
        ["CHAINSAW MAN" , "CSM"],
        ["SEVEN DEADLY SINS" , "NANATSU NO TAIZAI" , "7DS" , "SDS" , "NNT"],
        ["YOTSUBA&" , "YOTSUBA TO" , "YOTSUBA"],
        ["YUYU HAKUSHO" , "YU YU HAKUSHO" , "YYH"],
        ["UZUMAKI" , "SPIRALE"],
        ["AO NO EXORCIST" , "BLUE EXORCIST"],
        ["SWORD ART ONLINE" , "SAO"],
        ["RAINBOW NISHA ROKUBO NO SHICHININ" , "RAINBOW" , "RAINBOW NISHA"],
        ["COQ DE COMBAT" , "SHAMO"],
        ["KUROKO NO BASKET" , "KUROKO'S BASKET", "KNB"],
        ["BOKU DAKE GA INAI MACHI" , "ERASED"],
        ["SHOKUGEKI NO SOMA" , "FOOD WARS"],
        ["KOE NO KATACHI" , "A SILENT VOICE" , "SILENT VOICE"],
        ["HAIKYUU" , "HAIKYU"],
        ["MP100" , "MOB PSYCHO 100" , "MOB PSYCHO"],
        ["LUPIN III" , "LUPIN"],
        ["SAIKI K" , "SAIKI KUSUO" , "SAIKI" , "SAIKI KUSUO NO PSI NAN"],
        ["YU GI OH" , "YUGIOH"],
        ["AKATSUKI NO YONA" , "YONA" , "YONA OF THE DAWN"],
        ["KAICHOU WA MAID SAMA" , "MAID SAMA"],
        ["KAMISAMA HAJIMEMASHITA" , "DIVINE NANAMI" , "KAMISAMA KISS"],
        ["POCKET MONSTERS" , "POKEMON"],
        ["KEN ICHI LE DISCIPLE ULTIME" , "KEN ICHI"],
        ["MOBILE SUIT GUNDAM" , "GUNDAM"],
        ["NARUTO" , "NARUTO SHIPPUDEN"],
        ["OWARI NO SERAPH" , "SERAPH OF THE END"],
        ["CASTLE IN THE SKY" , "LE CHATEAU DANS LE CIEL" , "LAPUTA"],
        ["LE CHATEAU AMBULANT" , "HOWL'S MOVING CASTLE"],
        ["CHIHIRO" , "LE VOYAGE DE CHIHIRO"],
        ["PRINCESSE MONONOKE" , "MONONOKE HIME" , "PRINCESS MONONOKE"],
        ["HIGSCHOOL OF THE DEAD" , "HIGH SCHOOL OF THE DEAD"],
        ["CYBERPUNK EDGERUNNERS" , "CYBERPUNK"],
        ["CAPTAIN TSUBASA" , "OLIVE ET TOM"],
        ["INAZUMA" , "INAZUMA 11", "INAZUMA ELEVEN"],
        ["KINDAICHI CASE FILES" , "LES ENQUETES DE KINDAICHI" , "KINDAICHI"],
        ["KAGUYA SAMA LOVE IS WAR" , "KAGUYA SAMA" , "KAGUYA"],
        ["KOKO NO HITO" , "ASCENSION" , "THE CLIMBER"],
        ["SAKURA CHASSEUSE DE CARTES" , "CCS" , "CARDCAPTOR SAKURA"],
        ["TTGL" , "TENGEN TOPPA GURREN LAGANN" , "GURREN LAGANN"],
        ["USHIO ET TORA" , "USHIO TO TORA" , "USHIO AND TORA"],
        ["PARASYTE" , "PARASYTE THE MAXIM" , "PARASITE" , "KISEIJUU" , "KISEIJU"],
        ["SOUSOU NO FRIEREN" , "FRIEREN"],
        ["L'ERE DES CRISTAUX" , "HOUSEKI NO KUNI"],
        ["UMINEKO NO NAKU KORO NI" , "UMINEKO"],
        ["WHEN THEY CRY" , "HIGURASHI" , "HIGURASHI NO NAKU KORO NI"],
        ["MARCHE COMES IN LIKE A LION" , "SANGATSU NO LION" , "3 GATSU NO LION"],
        ["THE FLAGRANT FLOWER BLOOMS WITH DIGNITY" , "BLOOM" , "KAORUHANA" , "KAORU HANA WA RIN TO SAKU"],
        ["KONO OTO TOMARE" , "SOUNDS LIFE"],
        ["THE SUMMER YOU WERE THERE" , "NOTRE ETE EPHEMERE"],
        ["THE APOTHECARY DIARIES" , "KUSURIYA NO HITORIGOTO" , "APOTHECARY DIARIES" , "LES CARNETS DE L'APOTHICAIRE" , "CARNETS DE L'APOTHICAIRE"],
        ["LEGEND OF THE GALAXY HEROES" , "LES HEROS DE LA GALAXIE" , "GINGA EIYUU DENSETSU"],
        ["YOUR NAME" , "KIMI NO NA WA"],
        ["LE PECHE DE TAKOPI" , "TAKOPI" , "TAKOPI NO GENZAI"],
        ["EIGHTY SIX" , "86"],
        ["BOKU NO KOKORO NO YABAI YATSU" , "THE DANGERS IN MY HEART" , "DANGERS IN MY HEART" , "BOKUYABA"],
        ["JOURNAL WITH WITCH" , "IKOKU NIKKI"],
        ["SHIGATSU WA KIMI NO USO" , "YOUR LIE IN APRIL"],
        ["FATE" , "FATE STAY NIGHT"],
        ["FATE STAY NIGHT UNLIMITED BLADE WORKS" , "FATE UBW" , "FATE STAY NIGHT UBW"],
        ["BUNGO STRAY DOGS" , "BUNGOU STRAY DOGS"],
        ["RASCAL DOES NOT DREAM OF BUNNY GIRL SENPAI" , "SEISHUN BUTA YAROU" , "BUNNY GIRL SENPAI"],
        ["REZERO" , "RE ZERO" , "RE:ZERO"],
        ["ALBATOR 78" , "ALBATOR"],
        ["TERROR IN RESONANCE" , "ZANKYOU NO TERROR"],
        ["NO GAME NO LIFE" , "NGNL"],
        ["BIENVENUE DANS LA NHK" , "WELCOME TO THE NHK" , "WELCOME TO NHK"],
        ["VISION OF ESCAFLOWNE" , "VISION D'ESCAFLOWNE"],
        ["PING PONG" , "PÏNG PONG THE ANIMATION"],
        ["TATAMI GALAXY" , "THE TATAMI GALAXY"],
        ["SERIAL EXPERIMENTS LAIN" , "LAIN"],
        ["OJAMAJO DOREMI" , "MAGICAL DOREMI"],
        ["PUELLA MAGI MADOKA MAGICA" , "MADOKA MAGICA"],
        ["MOI QUAND JE ME REINCARNE EN SLIME" , "TENSURA"],
        ["LAST HERO INUYASHIKI" , "INUYASHIKI"],
        ["DECADENCE" , "DECA DENCE"],
        ["KAKEGURUI" , "GAMBLING SCHOOL"],
        ["GOLDEN KAMUI" , "GOLDEN KAMUY"],
        ["DARWINS GAME" , "DARWIN'S GAME"],
        ["MORIATY THE PATRIOT" , "MORIATY"],
        ["HARUHI SUZUMIYA" , "LA MELANCOLIE DE HARUHI SUZUMIYA"],
        ["ORE MONOGATARI" , "MON HISTOIRE"],
        ["YUSHIRAYUKI AUX CHEVEUX ROUGESJI" , "SHIRAYUKI"],
        ["CLASSROOM OF THE ELITE" , "YOUZITSU"],
        ["OREGAIRU" , "SNAFU"],
        ["BOYS ABYSS" , "BOYS ABYSS"],
        ["RANKING OF KINGS" , "OUSAMA RANKING" , "OSAMA RANKING"],
        ["KATEKYO HITMAN REBORN" , "REBORN"],
        ["OUSAMA GAME" , "OSAMA GAME" , "KING'S GAME" , "KINGS GAME"],
        ["RIKUDOU" , "RIKUDO" , "RIKU DO"],
        ["LES FLEURS DU MAL" , "AKU NO HANA"],
        ["NOZOKIANA" , "NOZOKI ANA"],
        ["PRISONNIER RIKU" , "SHUJIN RIKU"],
        ["HENGOKU NO SCHWEISTER" , "LE COUVENT DES DAMNES"],
        ["LES LIENS DU SANG" , "CHI NO WADACHI" , "BLOODS ON THE TRACKS"],
        ["SPY X FAMILY" , "SPY FAMILY"],
        ["THE RISING OF THE SHIELD HERO" , "SHIELD HERO" , "TATE NO YUUSHA"],
        ["MON VOISIN TOTORO" , "TOTORO"],
        ["LES ENFANTS DU TEMPS" , "TENKI NO KO"],
        ["GRAVE OF THE FIREFLIES" , "LE TOMBEAU DES LUCIOLES"],
        ["THE QUINTESSENTIAL QUINTUPLETS" , "QUINTESSENTIAL QUINTUPLETS" , "GOTOBUN NO HANAYOME" , "GOTOUBUN" , "5 TOUBUN" , "5TOUBUN"],
        ["STEIN'S GATE" , "STEINS GATE"],
        ["PONYO SUR LA FALAISE" , "PONYO"],
        ["TO YOUR ETERNITY" , "FUMETSU NO ANATA E"],
        ["JIGOKURAKU" , "HELLS PARADISE" , "HELL'S PARADISE"],
        ["TENGOKU DAIMAKYOU" , "HEAVENLY DELUSION"],
        ["NAGATORO" , "NAGATORO SAN"],
        ["SUMMER TIME RENDERING" , "SUMMER TIME RENDERING" , "TIME SHADOWS" , "SUMMERTIME RENDER"],
        ["ZOMBIE LAND SAGA" , "ZOMBIELAND SAGA"],
        ["KOMI CAN'T COMMUNICATE" , "KOMI SAN" , "KOMI"],
        ["ICHIGO 100%" , "ICHIGO 100"],
        ["LE FRUIT DE LA GRISAIA" , "GRISAIA NO KAJITSU"],
        ["TOARU" , "A CERTAIN MAGICAL INDEX"],
        ["SAKURASOU NO PET" , "SAKURASOU NO PET NA KANOJO"],
        ["TOMO CHAN IS A GIRL" , "TOMO CHAN"],
        ["THE 100 GIRLFRIENDS WHO REALLY LOVE YOU" , "THE 100 GIRLFRIENDS"],
        ["DU MOUVEMENT DE LA TERRE" , "ORB"],
        ["K ON" , "KON"],
        ["MISS KOBAYASHIS DRAGON MAID" , "DRAGON MAID"],
        ["BAKI HANMA" , "BAKI"],
        ["tHE EMINENCE IN SHADOW" , "EMINENCE IN SHADOW"],
        ["RAKUDAI KISHI NO CAVALRY" , "CHIVALRY OF A FAILED KNIGHT"],
        ["ACE OF DIAMOND" , "DIAMOND NO ACE"],
        ["THE PRINCE OF TENNIS" , "PRINCE OF TENNIS"],
        ["WAVE LISTEN TO ME" , "BORN TO BE ON AIR"],
        ["YOFUKASHI NO UTA" , "CALL OF THE NIGHT"],
        ["DOMESTIC NA KANOJO" , "DOMESTIC GIRLFRIEND"],
        ["PARIPI KOUMEI" , "YA BOY KONGMING"],
        ["EN SELLE SAKAMICHI" , "YOWAMUSHI PEDAL"],
        ["MAHOUTSUKAI NO YOME" , "THE ANCIENT MAGUS BRIDE"],
        ["KAIJU N8" , "KAIJUU 8" , "KAIJU 8" , "KAIJU NO 8"],
        ["LES ENFANTS LOUPS AME ET YUKI" , "LES ENFANTS LOUPS" , "WOLF CHILDREN"],
        ["LE CONTE DE LA PRINCESSE KAGUYA" , "KAGUYA HIME"],
        ["THE BOY AND THE BEAST" , "LE GARCON ET LA BETE" , "BAKEMONO NO KO"],
        ["SOUVENIRS DE MARNIE" , "WHEN MARNIE WAS THERE"],
        ["SI TU TENDS L'OREILLE" , "SI TU TENDS LOREILLE"],
        ["ARIETTY LE PETIT MONDE DES CHAPARDEURS" , "ARIETTY"],
        ["JOSEE LE TIGRE ET LES POISSONS" , "JOSEE"],
        ["L'ILE DE GIOVANNI" , "LILE DE GIOVANNI"],
        ["KIKI LA PETITE SORCIERE" , "KIKI"],
        ["POMPO THE CINEPHILE" , "POMPO"],
        ["PATEMA ET LE MONDE INVERSE" , "PATEMA"],
        ["PIANO FOREST" , "PIANO NO MORI"],
        ["DE L'AUTRE COTE DU CIEL" , "DE LAUTRE COTE DU CIEL"],
        ["5 CENTIMETRES PAR SECONDE" , "5CM PAR SECOND" , "5CM PER SECOND"],
        ["LOU ET L'ILE AUX SIRENES" , "LOU ET LILE AUX SIRENES"],
        ["MIRAI MA PETITE SOEUR" , "MIRAI"],
        ["MES VOISINS LES YAMADAS" , "MES VOISINS LES YAMADA"],
        ["KIE LA PETITE PESTE" , "KIE"],
        ["L'OEUF DE L'ANGE" , "LOEUF DE LANGE"],
        ["LES CONTES DE TERREMER" , "GEDO SENKI"],
        ["VERS LA FORET DES LUCIOLES" , "HORUTABI NO MORI E"],
        ["LES AILES D'HONNEAMISE" , "LES AILES DHONNEAMISE"],
        ["JE PEUX ENTENDRE L'OCEAN" , "JE PEUX ENTENDRE LOCEAN"],
        ["JIBAKU SHOUNEN HANAKO KUN" , "TOILET BOUND HANAKO KUN" , "HANAKO KUN" , "HANAKO"],
        ["ADACHI AND SHINAMURA" , "ADACHI TO SHINAMURA"],
        ["PRESQUE MARIES LOIN DETRE AMOUREUX" , "PRESQUE MARIES LOIN D'ETRE AMOUREUX" , "FUFU IJO" , "FUUFU IJOU" ,  "MORE THAN A MARRIED COUPLE"],
        ["KIWI WA HOUKAGO INSOMNIA" , "INSOMNIACS AFTER SCHOOL"],
        ["LAID BACK CAMP" , "YURU CAMP"],
        ["HIKARU GA SHINDA NATSU" , "THE SUMMER HIKARU DIED"],
        ["RANMA" , "RANMA 1/2"],
        ["MON VOISIN D'A COTE" , "TONARI NO KAIBUTSU KUN" , "MY LITTLE MONSTER"],
        ["CHOUCHOUTE PAR L'ANGE D'A COTE" , "OTONARI NO TENSHI SAMA" , "THE ANGEL NEXT DOOR SPOILS ME ROTTEN" , "THE ANGEL NEXT DOOR" , "OTONARI NO TENSHI"],
        ["KINSOU NO VERMEIL" , "VERMEIL IN BOLD" , "VERMEIL"],
        ["TAKT OP DESTINY" , "TAKT OP"],
        ["WORLDS END HAREM" , "WORLD'S END HAREM"],
        ["LES MEMOIRES DE VANITAS" , "VANITAS NO KARTE" , "VANITAS"],
        ["SK8 THE INFINITY" , "SK8"],
        ["TONIKAKU KAWAI" , "TONIKAKU KAWAII" , "TONIKAWA"],
        ["HOKKAIDO GALS" , "HOKKAIDO GAL"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],
        ["YUJI" , "ITADORI"],

    ],

    // ============================================
    // PROTAGONIST
    // ============================================
    "Protagonist": [
        ["GOKU", "SON GOKU" , "KAKAROT" , "SONGOKU"],
        ["SAILOR MOON", "USAGI"],
        ["YUJI" , "ITADORI"],
        ["SHOYO"  , "HINATA"],
        ["LIGHT", "KIRA"],
        ["KAZUTO", "KIRITO"],
        ["SHIRO",  "SHIROU"],
        ["RIMURU" , "LIMULE"],
        ["SHIDOU" , "SHIDO"],
        ["SHIGEO" , "MOB"],
        ["TWILIGHT","LOID"],
        ["VLADILENA","LENA"],
        ["SOUMA" , "SOMA"],
        ["TOORU" , "TOHRU"],
        ["TOUMA" , "TOMA"],
        ["PHOSPHOPHYLLITE" , "PHOS"],
        ["JADEN" , "JUDAI"],
        ["MIDORIYA" , "IZUKU" , "DEKU"],
        ["TAKEZO" , "MUSASHI" , "MIYAMOTO"],
        ["KURONO", "KEI"],
        ["SAWADA", "TSUNAYOSHI" , "TSUNA"],
        ["EZAEAZE", "MUSTANG" , "EKEKEK"],
        ["SAKURAGI", "HANAMICHI"],
        ["ALITA", "GALLY" , "YOKO"],
        ["ASTRO BOY", "ATOM" , "EKEKEK"],
        ["TSUBASA", "OLIVIER"],
        ["BLACK JACK", "KURO"],
        ["SHINTARO", "JAGASAKI"],
        ["GOBLIN SLAYER" , "ORCBOLG"],
        ["LEGOSI", "LEGOSHI"],
        ["HACHIMAN" , "HIKIGAYA"],
        ["NANAHARA", "SHUYA"],
        ["OKAZAKI", "TOMOYA"],
        ["JINTA", "JINTA"],
        ["PHOSPHOPHYLLITE", "PHOS"],
        ["TOKITA", "ASHURA"], 
        ["MARK EVANS", "MARK" ,"ENDOU" , "ENDO"],
        ["JIN MORI", "MORI JIN"],
        ["RYO", "NICKY LARSON" , "NICKY"],
        ["HIROTAKA", "NIFUJI"],
        ["IMM", "FUSHI"],
        ["YAMORI", "KOU"]
    ],

    // ============================================
    // FULLMETAL ALCHEMIST
    // ============================================
    "FullmetalAlchemist": [
        ["AL" , "ALPHONSE ELRIC" , "ALPHONSE"],
        ["ED" , "EDWARD ELRIC" , "EDWARD"],
        ["ROY", "MUSTANG"],
        ["MAES", "HUGUES"],
        ["HAWKEYE", "RIZA"],
        ["HAVOC", "JEAN"],
        ["KING BRADLEY", "WRATH"],
        ["SELIM BRADLEY", "SELIM" , "PRIDE"],
        ["FATHER", "PERE"],
        ["LIN YAO", "LING YAO" , "LING" , "LIN"],
        ["HIROFUMI", "YOSHIDA"],
        ["HIROFUMI", "YOSHIDA"],
        ["HIROFUMI", "YOSHIDA"]
    ],

    // ============================================
    // CHAINSAW MAN
    // ============================================
    "ChainsawMan": [
        ["ANGEL DEVIL", "DEMON ANGE"],
        ["DEMON VIOLENCE", "GALGALI"],
        ["PRINCI", "DEMON ARAIGNEE"],
        ["REZE", "DEMON BOMBE"],
        ["POWER", "DEMON SANG"],
        ["HIROFUMI", "YOSHIDA"],
        ["PERE NOEL", "SANTA CLAUS"],
        ["HOMME KATANA", "SAMURAI SWORD", "SAMOURAI SWORD" , "KATANA MAN"],
        ["MAKIMA", "DEMON DOMINATION"],
        ["FOX DEVIL", "DEMON RENARD"],
        ["FAMI", "DEMON FAMINE" , "KIGA"],
        ["DEMON TRONCONNEUSE", "POCHITA"],
        ["DEMON COSMOS" , "COSMO"]
    ],

    // ============================================
    // BLACK CLOVER
    // ============================================
    "BlackClover": [
        ["RYUDO", "RYUYA", "RYUDO RYUYA"],
        ["LOLOPECHKA", "LOROPECHIKA"],
        ["BELL", "SYLPHE" , "SYLPH"],
        ["VET", "VETTO"],
        ["RIYAH", "RHYA" , "RIYA"],
        ["REVE", "REV"],
        ["SOEUR LILY", "SISTER LILY" , "LILY AQUARIA"],
        ["GOSH ADLEY", "GOSH" , "GAUCHE"],
        ["GREY", "GRAY"],
        ["SECRE SWALLOWTAIL", "NERO" , "SECRE"],
        ["REINE DES SORCIERES", "WITCH QUEEN"],
        ["NAHAMA", "NAHAMAH"],
        ["BELZEBUTH", "BEELZEBUB"],
        ["SALAMANDER", "SALAMANDRE"],
        ["JACK THE RIPPER", "JACK" , "JACK L'EVENTREUR"],
        ["MORIS" , "MORRIS"],
        ["DEMITRI", "DIMITRI" , "DEMITRI BRINT"],
        ["UNDINE", "ONDINE"]
    ],

    // ============================================
    // DEATH NOTE
    // ============================================
    "DeathNote": [
        ["KIRA", "LIGHT", "LIGHT YAGAMI"],
        ["MISA MISA", "MISA AMANE", "MISA"],
        ["L", "L LAWLIET", "RYUSAKI"],
        ["NEAR", "NATE RIVER", "NATE", "N"],
        ["MELLO", "MIHAEL KEEHL", "MIHAEL", "M"],
        ["WATARI", "QUILLSH WAMMY", "QUILLSH"],
        ["AIBER", "THIERRY MORELLO", "THIERRY"],
        ["ROI DE LA MORT", "KING OF DEATH"],
        ["SHIDOH", "SIDOH"],
        ["MATT", "MAIL"],
        ["MARY", "MERRY KENWOOD", "MERRY"],
    ],

    // ============================================
    // FAIRY TAIL
    // ============================================
    "FairyTail": [
        ["LAXUS", "LAXUS DREYAR", "LUXUS", "LUXUS DREYAR"],
        ["GREY", "GREY FULLBUSTER", "GRAY", "GRAY FULLBUSTER"],
        ["CANA", "CANA ALBERONA", "KANNA", "KANNA ALBERONA", "KANA", "KANA ALBERONA"],
        ["SHERRIA", "SHERRIA BLENDY", "CHERRYA", "CHERRYA BLENDY", "SHERIA"],
        ["BIXROW", "BIXLOW"],
        ["CHARLES", "CARLA"],
        ["LEO" , "LOKI"],
        ["ERIK", "COBRA"],
        ["DORANBOLT", "MEST", "MEST GRYDER"],
        ["HISUI", "JADE", "JADE FIORE"],
        ["PRECHT", "HADES"],
        ["SAWYER", "RACER"],
        ["ANGEL", "SORANO"],
        ["MYSTOGAN" , "MISTGUN"],
        ["MAKAROV", "MAKAROV DREYAR", "MAKAROF"],
        ["LISANNA", "LISANNA STRAUSS", "LISANA", "LISANA STRAUSS"],
        ["EILEEN", "EILEEN BELSERION", "IRENE", "IRENE BELSERION"],
        ["LARCADE", "LARCADE DRAGNEEL", "RAHKEID"],
        ["ZEREF", "ZELEPH"],
        ["FREED", "FREED JUSTINE" , "FRIED"],
        ["NATSU", "NATSU DRAGNEEL", "E.N.D", "END"],
    ],

    // ============================================
    // JUJUTSU KAISEN
    // ============================================
    "JujutsuKaisen": [
        ["YUJI", "YUJI ITADORI", "ITADORI", "ITADORI YUJI"],
        ["TOGE", "INUMAKI"],
        ["JUNPEI", "JUMPEI", "JUMPEI YOSHINO"],
        ["KAMO NORITOSHI", "NORITOSHI KAMO"],
        ["TAKADA CHAN", "TAKADA-CHAN"],
        ["RIKO", "RIKO AMANAI", "AMANAI"],
    ],

    // ============================================
    // MY HERO ACADEMIA
    // ============================================
    "MyHeroAcademia": [
        ["RECOVERY GIRL", "CHIYO SHUZENJI", "CHIYO"],
        ["THIRTEEN", "ANAN", "ANAN KUROSE"],
        ["HOUND DOG", "RYO", "RYO INUI"],
        ["PHANTOM THIEF", "NEITO", "MONOMA" , "NEITO MONOMA"],
        ["ALL MIGHT", "YAGI", "TOSHINORI YAGI" , "TOSHINORI"],
        ["ERASER HEAD", "AIZAWA", "SHOTA AIZAWA"],
        ["PRESENT MIC", "HIZASHI YAMADA", "HIZASHI"],
        ["CEMENTOS", "CEMENTOSS", "KEN ISHIYAMA", "KEN"],
        ["MIDNIGHT", "NEMURI KAYAMA", "NEMURI"],
        ["GANG ORCA", "ORCA", "KUGO SAKAMATA" , "KUGO"],
        ["POWER LOADER", "HIGARI MAIJIMA", "HIGARI"],
        ["VLAD KING", "SEIKIJIRO KAN", "SEIKIJIRO"],
        ["GRAN TORINO", "SORAHIKO TORINO", "SORAHIKO"],
        ["CAN'T STOP TWINKLING", "YUGA AOYAMA", "YUGA"],
        ["PINKY", "MINA ASHIDO", "MINA"],
        ["FROPPY", "TSUYU ASUI", "TSUYU"],
        ["LEMILLION" , "TOGATA MIRIO", "MIRIO"],
        ["INGENIUM", "TENYA IDA", "TENYA", "IDA"],
        ["URAVITY", "OCHACO URARAKA", "OCHACO"],
        ["BEST JEANIST", "TSUNAGU HAKAMADA", "TSUNAGU"],
        ["TAILMAN", "MASHIRAO OJIRO", "MASHIRAO"],
        ["CHARGEBOLT", "DENKI KAMINARI", "DENKI"],
        ["RED RIOT", "EIJIRO KIRISHIMA", "EIJIRO" , "KIRISHIMA"],
        ["ANIMA", "KOJI KODA", "KOJI"],
        ["SUGARMAN", "RIKIDO SATO", "RIKIDO"],
        ["HIMIKO TOGA", "HIMIKO", "TOGA"],
        ["TENTACOLE", "MEZO SHOJI", "SHOJI"],
        ["EARPHONE JACK", "KYOKA JIRO", "KYOKA"],
        ["CELLOPHANE", "HANTA SERO", "HANTA", "SERO"],
        ["TSUKUYOMI", "FUMIKAGE TOKOYAMI", "FUMIKAGE"],
        ["INVISIBLE GIRL", "TORU HAGAKURE", "TORU"],
        ["DEKU", "IZUKU MIDORIYA", "IZUKU"],
        ["KACCHAN", "KATSUKI BAKUGO", "BAKUGO"],
        ["CREATI", "MOMO YAOYOROZU", "MOMO"],
        ["SHOTO", "SHOTO TODOROKI", "TODOROKI"],
        ["PIXIE BOB", "PIXIE-BOB", "RYUKO TSUCHIKAWA"],
        ["MANDALAY", "SHINO SOSAKI", "SHINO"],
        ["MANUAL", "MASAKI MIZUSHIMA", "MASAKI"],
        ["FAT GUM", "TAISHIRO TOYOMITSU", "TAISHIRO"],
        ["MT LADY", "MOUNT LADY", "YU TAKEYAMA", "YU"],
        ["TIGER", "YAWARA CHATORA", "YAWARA"],
        ["CENTIPEDER", "JUZO MOASHI"],
        ["ROCK LOCK", "KEN TAKAGI"],
        ["TOY TOY", "TOY-TOY"],
        ["CAPTAIN CELEBRITY", "CHRISTOPHER SKYLINE", "CHRISTOPHER"],
        ["HIS PURPLE HIGHNESS", "TENMA NAKAOJI", "TENMA"],
        ["ODD EYE", "ODD-EYE"],
        ["RAGDOLL", "TOMOKO SHIRETOKO", "TOMOKO"],
        ["STAR AND STRIPE", "CATHLEEN BATE", "CATHLEEN"],
        ["MAJESTIC", "ENMA KANNAGI", "ENMA"],
        ["SIR NIGHTEYE", "MIRAI SASAKI", "MIRAI"],
        ["SNATCH", "SAJIN HIGAWARA", "SAJIN"],
        ["NUMBER 6", "ROKURO NOMURA", "ROKURO"],
        ["MASTER", "IWAO OGURO", "IWAO"],
        ["LADY NAGANT", "KAINA TSUTSUMI", "KAINA"],
        ["LARIAT", "DAIGORO BANJO", "DAIGORO"],
        ["BUBBLE GIRL", "KAORUKO AWATA", "KAORUKO"],
        ["BURNIN", "MOE KAMIJI", "MOE"],
        ["THE CRAWLER", "KOICHI HAIMAWARI", "KOICHI"],
        ["STAIN", "CHIZOME AKAGURO", "CHIZOME"],
        ["GENTLE CRIMINAL", "DANJURO TOBITA", "DANJURO"],
        ["LA BRAVA", "MANAMI AIBA", "MANAMI"],
        ["PEERLESS THIEF", "OJI HARIMA", "OJI"],
        ["MUSCULAR", "GOTO IMASUJI", "GOTO"],
        ["CHIMERA", "CHOJURO KON", "CHOJURO"],
        ["MUMMY", "HOYO MAKIHARA", "HOYO"],
        ["SLICE", "KIRUKA HASAKI", "KIRUKA"],
        ["VOLCANO", "MAGUMA IAWATA", "MAGUMA"],
        ["DUSTY ASH", "ONAKO HAIZONO", "ONAKO"],
        ["GUST BOY", "TSUMUJI KAZETANI", "TSUMUJI"],
        ["SHIGARAKI", "SHIGARAKI TOMURA", "TOMURA", "TENKO", "TENKO SHIMURA"],
        ["DR KYUDAI", "KYUDAI", "KYUDAI GARAKI", "DR TSUBASA", "DARUMA UJIKO", "DARUMA"],
        ["GIRAN", "KAGERO OKUTA", "KAGERO"],
        ["DABI", "TOYA TODOROKI", "TOYA"],
        ["TWICE", "JIN BUDAIGAWARA", "JIN"],
        ["SPINNER", "SHUICHI IGUCHI", "SHUICHI"],
        ["MR COMPRESS", "ATSUHIRO SAKO", "ATSUHIRO"],
        ["MAGNE", "KENJI HIKIISHI", "KENJI"],
        ["RE-DESTRO", "RIKIYA YOTSUBASHI", "RIKIYA"],
        ["CURIOUS", "CHITOSE KIZUKI", "CHITOSE"],
        ["TRUMPET", "KOKU HANABATA", "KOKU"],
        ["SKEPTIC", "TOMOYASU CHIKAZOKU", "TOMOYASU"],
        ["DESTRO", "CHIKARA YOTSUBASHI", "CHIKARA"],
        ["GETEN", "HIMURA", "ICEMAN"],
        ["OVERHAUL", "KAI CHISAKI", "CHISAKI"],
        ["BAT VILLAIN", "BATTO YOBAYAKAWA", "BATTO"],
        ["OCTOID", "IKAJIRO TAKOBE", "IKAJIRO"],
        ["CHRONOSTASIS", "HARI KURONO", "HARI"],
        ["MIMIC", "JOI IRINAKA", "JOI"],
        ["THE RAPPER", "KENDO RAPPA", "KENDO"],
        ["POP STEP", "KAZUHO HANEYAMA", "KAZUHO"],
        ["TRUE MAN", "NAOMASA TSUKAUCHI", "NAOMASA"],
        ["KANIKO", "MONIKA KANIYASHIKI", "MONIKA"],
        ["OXY-MAN", "OXY MAN"],
    ],

    // ============================================
    // JOJO'S BIZARRE ADVENTURE
    // ============================================
    "Jojo": [
        ["WAMUU", "WAMU"],
        ["SOUNDMAN", "SANDMAN"],
        ["D-I-S-C-O", "DISCO"],
        ["HERMES", "ERMES", "ERMES COSTELLO"],
        ["TOORU", "TORU"],
        ["SPORTS MAXX", "SPORTS MAX"],
        ["GEORGE 1", "GEORGE I", "GEORGE JOESTAR 1", "GEORGE JOESTAR I"],
        ["GEORGE 2", "GEORGE II", "GEORGE JOESTAR 2", "GEORGE JOESTAR II"],
        ["NDOUL", "N DOUL", "N'DOUL"],
        ["FF", "F.F", "FOO FIGHTERS"],
        ["DARBY", "D ARBY", "D'ARBY", "DANIEL", "DANIEL J DARBY"],
        ["SHIGECHI", "SHIGEKIYO", "SHIGEKIYO YANGUAWA"],
    ],

    // ============================================
    // REBORN
    // ============================================
    "Reborn": [
        ["TSUNAYOSHI SAWADA", "SAWADA", "TSUNA", "VONGOLA DECIMO"],
        ["DEMON SPADE", "DAEMON SPADE"],
        ["I PIN", "I-PIN"],
        ["VONGOLA SETTIMO", "FABIO"],
        ["VIPER", "MAMMON"],
        ["MM", "M.M", "M M"],
    ],

    // ============================================
    // KPOP (bonus)
    // ============================================
    "Kpop": [
        ["SUA", "SU A"],
        ["DO", "D.O."],
        ["G DRAGON", "G-DRAGON"],
    ],
};

// ============================================
// Mapping des clés de bombdata.json vers les clés de CHARACTER_VARIANTS
// ============================================
const THEME_MAPPING = {
    "Dbz": "Dbz",
    "DragonBall": "Dbz",
    "Naruto": "Naruto",
    "OnePiece": "OnePiece",
    "HunterXHunter": "HunterXHunter",
    "Hxh": "HunterXHunter",
    "Snk": "Snk",
    "Pokemon": "Pokemon",
    "Bleach": "Bleach",
    "BlackClover": "BlackClover",
    "DemonSlayer": "DemonSlayer",
    "ChainsawMan" : "ChainsawMan",
    "DeathNote": "DeathNote",
    "FairyTail": "FairyTail",
    "JujutsuKaisen": "JujutsuKaisen",
    "Jjk": "JujutsuKaisen",
    "MyHeroAcademia": "MyHeroAcademia",
    "Mha": "MyHeroAcademia",
    "Fma": "FullmetalAlchemist",
    "Prota" : "Protagonist",
    "Manganime" : "Manganime",
    "Gintama" : "Gintama",
    "BokuNoHeroAcademia": "MyHeroAcademia",
    "Jojo": "Jojo",
    "JojosBizarreAdventure": "Jojo",
    "Reborn": "Reborn",
};

/**
 * Récupère toutes les variantes à bloquer pour un nom donné
 * @param {string} name - Le nom du personnage (en majuscules)
 * @param {string} theme - Le thème/anime (clé de bombdata.json)
 * @returns {string[]} - Tableau de tous les noms à bloquer (incluant le nom original)
 */
function getVariantsToBlock(name, theme) {
    const normalizedName = name.toUpperCase().trim();
    
    // Mapper le thème vers la clé de CHARACTER_VARIANTS
    const variantKey = THEME_MAPPING[theme] || theme;
    const themeVariants = CHARACTER_VARIANTS[variantKey];
    
    if (!themeVariants) {
        // Pas de variantes pour ce thème, retourner juste le nom
        return [normalizedName];
    }
    
    // Chercher le groupe qui contient ce nom
    for (const group of themeVariants) {
        if (group.includes(normalizedName)) {
            // Retourner tout le groupe
            return [...group];
        }
    }
    
    // Nom non trouvé dans les groupes, retourner juste le nom
    return [normalizedName];
}

/**
 * Vérifie si deux noms sont des variantes l'un de l'autre
 * @param {string} name1 
 * @param {string} name2 
 * @param {string} theme 
 * @returns {boolean}
 */
function areVariants(name1, name2, theme) {
    const variants = getVariantsToBlock(name1, theme);
    return variants.includes(name2.toUpperCase().trim());
}

/**
 * Ajoute la détection automatique des variantes par containsWord
 * (un nom contient l'autre ou vice versa)
 * @param {string} name - Le nom cité
 * @param {string[]} availableNames - Liste des noms encore disponibles
 * @param {string} theme - Le thème
 * @returns {string[]} - Tous les noms à bloquer
 */
function getAllNamesToBlock(name, availableNames, theme) {
    const normalizedName = name.toUpperCase().trim();
    const toBlock = new Set(getVariantsToBlock(normalizedName, theme));
    
    // 🎬 Mode Manganime : exact match uniquement (pas de word boundary)
    // Sinon "YUGIOH" bloquerait "YUGIOH GX", "DRAGON BALL" bloquerait "DRAGON BALL Z", etc.
    const variantKey = THEME_MAPPING[theme] || theme;
    if (variantKey === 'Manganime') {
        return Array.from(toBlock);
    }
    
    // Ajouter les noms qui contiennent le nom cité comme MOT COMPLET
    // (ex: "MONKEY D LUFFY" contient "LUFFY" comme mot → OK)
    // (ex: "GOTENKS" contient "GOTEN" mais PAS comme mot complet → IGNORÉ)
    for (const availableName of availableNames) {
        const upperAvailable = availableName.toUpperCase();
        if (upperAvailable === normalizedName) continue;
        
        // Vérifier si le nom cité est un mot complet dans le nom disponible
        // Ex: "GOTEN" dans "SON GOTEN" → match (séparé par espace)
        // Ex: "GOTEN" dans "GOTENKS" → pas match (pas de frontière de mot)
        const regexCitedInAvailable = new RegExp(`\\b${escapeRegex(normalizedName)}\\b`);
        if (regexCitedInAvailable.test(upperAvailable)) {
            toBlock.add(upperAvailable);
        }
        
        // Vérifier si le nom disponible est un mot complet dans le nom cité
        // Ex: "LUFFY" dans "MONKEY D LUFFY" → match
        const regexAvailableInCited = new RegExp(`\\b${escapeRegex(upperAvailable)}\\b`);
        if (regexAvailableInCited.test(normalizedName)) {
            toBlock.add(upperAvailable);
        }
    }
    
    return Array.from(toBlock);
}

// Échapper les caractères spéciaux regex
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
    CHARACTER_VARIANTS,
    THEME_MAPPING,
    getVariantsToBlock,
    areVariants,
    getAllNamesToBlock
};