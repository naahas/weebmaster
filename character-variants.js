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
        // « BLACK GOKU » sort d ici, mais par pure hygiène : la règle du MOT
        // ENTIER le reliait déjà à GOKU, l entrée ne servait à rien.
        ["GOKU", "SON GOKU", "SONGOKU", "KAKAROT"],

        // Le dragon à une étoile de GT, sous ses trois noms : « LI SHENRON »
        // et « I SHENRON » sont deux translittérations du même (Yi Xing Long),
        // et c est lui qui devient « OMEGA SHENRON » en absorbant les boules.
        //
        // ⚠️ Ce groupe est INDISPENSABLE, la règle du mot entier ne les relie
        // pas : « I SHENRON » n est pas un mot entier dans « LI SHENRON » —
        // entre le L et le I il n y a aucune frontière de mot. Les trois
        // étaient donc citables à la suite.
        //
        // ⚠️ Les huit autres dragons de GT ne sont PAS ici : ce sont huit
        // personnages distincts. Ce qu il fallait les empêcher de faire, c est
        // de se condamner entre eux par leur mot commun — voir SEULEMENT_EXACT.
        ["LI SHENRON", "I SHENRON", "OMEGA SHENRON"],

        // Goku Black, dans les deux ordres, plus « BLACK » tout court.
        //
        // ⚠️ CE GROUPE EST NÉCESSAIRE, et c est un cas rare. La règle du mot
        // entier ne relie PAS « GOKU BLACK » à « BLACK GOKU » : ni l un ni
        // l autre n apparaît en entier dans son jumeau, seuls leurs deux mots
        // se retrouvent, et le moteur compare des expressions complètes. Les
        // deux ordres étaient donc citables l un après l autre.
        //
        // ⚠️ Deux choses que ce groupe NE peut PAS faire, et qu il ne faut pas
        // espérer de lui :
        //   • séparer Goku de Goku Black. « GOKU » est un mot entier dans
        //     « GOKU BLACK » : le moteur les lie, groupe ou pas. Mesuré.
        //   • épargner « COLONEL BLACK ». « BLACK » y est aussi un mot entier,
        //     donc le citer le bloque. Seul un renommage de l entrée le
        //     règlerait.
        ["GOKU BLACK", "BLACK GOKU", "BLACK"],
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
        ["CHEELAI", "CHEELY"],
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

        // ── Les dieux de la destruction ──
        // Leurs noms voyagent mal d une traduction a l autre : chaque groupe
        // reunit l orthographe de la banque et celles qu on tape vraiment.
        ["MOSCO", "MOSCOW"],
        ["ARAK", "ARACK"],
        // ⚠️ C est SIDRA qui est dans la banque, pas CIDRA. Le groupe accepte
        // les deux ; la carte jouable reste celle de la banque.
        ["SIDRA", "CIDRA"],
        // ⚠️ JEREZ etait une ENTREE A PART dans bombdata : c est le meme dieu
        // qu HELLES, sous son nom francais. Les reunir retire donc un doublon
        // de la banque — Dbz perd un personnage, et c est voulu.
        ["HELLES", "HELES", "JEREZ"],
        ["IWAN", "IWNE"],
        ["RHUMUSH", "RYMUSH", "RUMSSHI", "RUMUSH"],
        ["LIQUIR", "LIQUIIR"],
        ["VERMOUD", "VERMOUDH", "BELMOD"],
        ["GIN", "JIN", "GEENE"],

        // Le Grand Prêtre, père des anges. « GRAND PRETRE » et « LE GRAND
        // PRETRE » étaient déjà liés par la règle du mot entier ; c est son nom
        // japonais qui vivait à part.
        ["DAISHINKAN", "LE GRAND PRETRE", "GRAND PRETRE"],
    ],

    // ============================================
    // NARUTO
    // ============================================
    "Naruto": [
        // Tobi EST Obito : deux noms pour un personnage, et la règle du mot
        // entier ne les relie pas — aucun n apparaît dans l autre.
        // ⚠️ « TOBIRAMA » et « SARUTOBI » contiennent bien TOBI, mais pas en
        // MOT ENTIER : le moteur ne les attrape pas, et ils restent citables.
        ["TOBI", "OBITO", "OBITO UCHIHA", "OBITO UCHIWA"],
        ["JIRAYA", "JIRAIA", "JIRAIYA"],
        ["ICHIBI", "SHUKAKU"],
        ["KILLER B", "KILLER BEE" , "BEE"],
        ["NIBI", "MATATABI"],
        ["SHI", "C"],
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
    // STUDIO
    // ============================================
    "Studio": [
        ["A1 PICTURES", "A-1 PICTURES"],
        ["C-STATION", "C STATION"],
        ["CYGAMESPICTURES", "CYGAMES PICTURES"],
        ["EIGHT BIT", "8 BIT"],
        ["KYOTO ANIMATION", "KYOANIMATION", "KYO ANIMATION" , "KYOANI"],
        ["PRODUCTION I.G", "PRODUCTION IG"],
        ["PROJECT NO 9", "PROJECT 9"],
        ["STUDIO A CAT", "STUDIO A-CAT", "A CAT", "A-CAT"]
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
        ["BEN BECKMAN", "BENN BECKMAN" , "BEN BECKMANN", "BENN BECKMANN" , "BECKMAN", "BECKMANN"],
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
        ["ENER", "ENERU", "ENEL"],
        // Le wiki FR ecrit « Gabban », Google plutot « Gaban ». On ne tranche
        // pas : les quatre formes comptent pour un seul personnage.
        ["SCOPPER GABAN", "GABAN", "SCOPPER GABBAN", "GABBAN"],
        ["BANCHINA", "BANKINA"],
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
        ["KURORO", "LUCIFER", "KURORO LUCIFER", "CHROLLO", "CHROLLO LUCILFER"],
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
        ["FLOCH", "FLOCK" , "FLOCH FORSTER", "FROCK", "FROCK FORSTER"],
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
        ["OGEKO", "OGÉKO"],
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
        ["HASCHWALTH", "JUGRAM"],
        // ⚠️ Deux ORTHOGRAPHES du meme nom, pas deux personnages : la regle du
        // mot entier ne pouvait pas les relier — « BARRAGAN » et « BARAGGAN »
        // ne partagent aucun mot, c est un R et un G qui se deplacent. Seul un
        // groupe les tient. Sans lui on marquait deux fois le meme Espada.
        ["BARAGGAN LOUISENBAIRN", "BARAGGAN", "BARRAGAN"],
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
        ["UROKODAKI SAKONJI", "SAKONJI", "UROKODAKI"],
        ["GYUTARO", "GYUTAROU"],
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
        ["SHIMARU SAITOU", "SAITOU" , "SAITO"]
    ],
    

    // ============================================
    // MANGANIME
    // ============================================
    "Manganime": [
        // ⚠️ DB et DBZ ne font QU UNE reponse, et c est voulu — la question a
        // ete posee et tranchee. A l ecran ce sont deux animes, mais c est le
        // MEME MANGA : « Z » est un decoupage de l anime, Toriyama n a jamais
        // publie qu une serie. Les separer ferait marquer deux fois le meme
        // titre. GT et Super, eux, restent a part : ce sont de vraies suites.
        ["DRAGON BALL" , "DB" , "DRAGONBALL", "DRAGON BALL Z" , "DBZ" , "DRAGONBALL Z"],
        ["DBGT" , "DRAGONBALL GT" , "DRAGON BALL GT"],
        // ⚠️ « DBS » appartient a ce groupe, et il y manquait : il est dans la
        // banque mais n etait cite dans AUCUN groupe, donc il ne bloquait que
        // lui-meme. « Dragon Ball Super » puis « DBS » rapportaient deux fois
        // la meme serie, en silence — ce n est pas une suite de plus, c est le
        // meme titre abrege. Un alias oublie ici se paie toujours comme ca.
        ["DBSUPER" , "DBS" , "DRAGONBALL SUPER" , "DRAGON BALL SUPER"],
        ["DBDAIMA" , "DRAGON BALL DAIMA" , "DRAGONBALL DAIMA"],
        ["FMA" , "FULLMETAL ALCHEMIST" , "FMAB" , "FULLMETAL ALCHEMIST BROTHERHOOD"],
        ["L'ATTAQUE DES TITANS" , "SHINGEKI NO KYOJIN" , "SNK" , "ATTACK ON TITAN" , "AOT" , "ATTAQUE DES TITANS"],
        ["HUNTER HUNTER" , "HXH" , "HUNTER X HUNTER"],
        ["GTO" , "GREAT TEACHER ONIZUKA"],
        ["BATTLE ANGEL ALITA" , "GUNNM"],
        ["DURARARA" , "DURARARA!!"],
        ["MEGALO BOX" , "MEGALOBOX"],
        ["BOBOBO" , "BOBOBO BO BO BOBO" , "BOBOBO-BO-BO-BOBO"],
        ["MERMAID MELODY" , "PICHI PICHI PITCH"],
        ["TOKYO MEW MEW" , "MEW MEW POWER"],
        ["THE IDOLMASTER" , "IDOLMASTER"],
        ["QUEENS BLADE" , "QUEEN'S BLADE"],
        ["BOYS ABYSS" , "BOY'S ABYSS"],
        // ⚠️ Ne PAS confondre avec « Nura le seigneur des yokai », qui est une
        // autre œuvre et a deja son groupe plus haut.
        ["NATSUMES BOOK OF FRIENDS" , "NATSUME BOOK OF FRIENDS" , "NATSUME'S BOOK OF FRIENDS" , "LE PACTE DES YOKAI"],
        ["HARUKANA MACHI E" , "QUARTIER LOINTAIN"],
        ["SHINSEKAI YORI" , "SHIN SEKAI YORI"],
        ["BOKU NO HERO ACADEMIA" , "MY HERO ACADEMIA" , "BNHA" , "MHA"],
        ["JOJO NO KIMYOU NA BOUKEN" , "JOJO" , "JOJO'S BIZARRE ADVENTURE" , "JOJOS BIZARRE ADVENTURE" , "JJBA"],
        ["THE JOJOLANDS" , "JOJOLAND" , "JOJOLANDS"],
        ["OPM" , "ONE PUNCH MAN"],
        ["BONNE NUIT PUNPUN" , "OYASUMI PUNPUN"],
        ["NAUSICAA" , "NAUSICAA DE LA VALLEE DU VENT" , "KAZE NO TANI NO NAUSICAA"],
        ["NICKY LARSON" , "CITY HUNTER"],
        ["MEITANTEI CONAN" , "DETECTIVE CONAN" , "CONAN" , "CASE CLOSED"],
        ["RURONI KENSHIN" , "KENSHIN LE VAGABOND" , "SAMURAI X" , "KENSHIN"],
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
        ["KUROKO NO BASKET" , "KUROKO'S BASKET", "KNB" , "KUROKO BASKET" , "KUROKOS BASKET"],
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
        ["KATEKYO HITMAN REBORN" , "KHR" , "REBORN"],
        ["KINDAICHI CASE FILES" , "LES ENQUETES DE KINDAICHI" , "KINDAICHI"],
        ["KAGUYA SAMA LOVE IS WAR" , "KAGUYA SAMA" , "KAGUYA" , "LOVE IS WAR"],
        ["KOKO NO HITO" , "ASCENSION" , "THE CLIMBER" , "KOKOU NO HITO"],
        ["SAKURA CHASSEUSE DE CARTES" , "CCS" , "CARDCAPTOR SAKURA"],
        ["TTGL" , "TENGEN TOPPA GURREN LAGANN" , "GURREN LAGANN"],
        ["USHIO ET TORA" , "USHIO TO TORA" , "USHIO AND TORA"],
        ["PARASYTE" , "PARASYTE THE MAXIM" , "PARASITE" , "KISEIJUU" , "KISEIJU"],
        ["SOUSOU NO FRIEREN" , "FRIEREN"],
        ["L'ERE DES CRISTAUX" , "HOUSEKI NO KUNI"],
        ["UMINEKO NO NAKU KORO NI" , "UMINEKO"],
        ["WHEN THEY CRY" , "HIGURASHI" , "HIGURASHI NO NAKU KORO NI"],
        ["MARCH COMES IN LIKE A LION" , "SANGATSU NO LION" , "3 GATSU NO LION"],
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
        ["PING PONG" , "PING PONG THE ANIMATION"],
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
        ["SHIRAYUKI AUX CHEVEUX ROUGES" , "SHIRAYUKI"],
        ["CLASSROOM OF THE ELITE" , "YOUZITSU"],
        ["OREGAIRU" , "SNAFU"],
        ["RANKING OF KINGS" , "OUSAMA RANKING" , "OSAMA RANKING"],
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
        ["STEIN'S GATE" , "STEINS GATE", "STEINS;GATE"],
        ["PONYO SUR LA FALAISE" , "PONYO"],
        ["TO YOUR ETERNITY" , "FUMETSU NO ANATA E"],
        ["JIGOKURAKU" , "HELLS PARADISE" , "HELL'S PARADISE"],
        ["TENGOKU DAIMAKYO" , "HEAVENLY DELUSION"],
        ["NAGATORO" , "NAGATORO SAN"],
        ["SUMMER TIME RENDERING" , "TIME SHADOWS" , "SUMMERTIME RENDER"],
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
        ["THE EMINENCE IN SHADOW" , "EMINENCE IN SHADOW"],
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
        ["ARRIETTY LE PETIT MONDE DES CHAPARDEURS" , "ARRIETTY" , "ARIETTY LE PETIT MONDE DES CHAPARDEURS" , "ARIETTY"],
        ["JOSEE LE TIGRE ET LES POISSONS" , "JOSEE"],
        ["L'ILE DE GIOVANNI" , "LILE DE GIOVANNI"],
        ["LA TRAVERSÉE DU TEMPS" , "LA TRAVERSEE DU TEMPS" , "THE GIRL WHO LEAPT THROUGH TIME"],
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
        ["VERS LA FORET DES LUCIOLES" , "HOTARUBI NO MORI E"],
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
        // ── Second lot, meme jour ──
        ["GOODBYE ERI" , "ADIEU ERI" , "SAYONARA ERI"],
        ["DEAD DEAD DEMONS DEDEDEDE DESTRUCTION" , "DEAD DEAD" , "DDDDD" , "DEDEDEDE DESTRUCTION"],
        ["MAQUIA" , "SAYONARA NO ASA NI YAKUSOKU NO HANA WO KAZAROU"],
        ["KOTARO EN SOLO" , "KOTARO LIVES ALONE"],
        ["BLUE BOX" , "AO NO HAKO"],
        ["YOUJO SENKI" , "TANYA THE EVIL" , "SAGA OF TANYA THE EVIL"],

        // ── Ajoutes le 26 septembre 2026 ──
        // Chaque groupe rassemble les graphies d UNE oeuvre : citer l une
        // bloque les autres, sinon « Lamu » et « Urusei Yatsura » compteraient
        // pour deux.
        ["KIMI NI TODOKE" , "FROM ME TO YOU"],
        ["LOVELY COMPLEX" , "LOVE COM" , "LOVECOM"],
        ["ITAZURA NA KISS" , "ITAKISS" , "MISCHIEVOUS KISS"],
        ["PARADISE KISS" , "PARAKISS"],
        ["HONEY AND CLOVER" , "HACHIMITSU TO CLOVER"],
        ["SKIP AND LOAFER" , "SKIP TO LOAFER"],
        ["GEKKAN SHOUJO NOZAKI KUN" , "MONTHLY GIRLS NOZAKI KUN" , "NOZAKI KUN"],
        ["CAT'S EYE" , "CATS EYE" , "SIGNE CATS EYE"],
        ["URUSEI YATSURA" , "LAMU" , "LUM"],
        ["KIMAGURE ORANGE ROAD" , "MAX ET COMPAGNIE"],
        ["VIDEO GIRL AI" , "DENEI SHOUJO"],
        ["BE-BOP HIGH SCHOOL" , "BE BOP HIGH SCHOOL"],
        ["CAPITAINE FLAM" , "CAPTAIN FUTURE"],
        ["SILVER SPOON" , "GIN NO SAJI"],
        ["OURAN HIGH SCHOOL HOST CLUB" , "OURAN KOUKOU HOST CLUB" , "HOST CLUB"],
        ["ZATCH BELL" , "KONJIKI NO GASH BELL" , "GASH BELL"],
        ["NURARIHYON NO MAGO" , "NURA LE SEIGNEUR DES YOKAI"],
        ["TENJHO TENGE" , "TENJO TENGE"],
        ["TERRA FORMARS" , "TERRAFORMARS"],
        ["KNIGHTS OF SIDONIA" , "SIDONIA NO KISHI"],
        ["ADOLF" , "ADOLF NI TSUGU"],
        ["MORIARTY THE PATRIOT" , "YUUKOKU NO MORIARTY" , "MORIARTY"],
        ["L'ATELIER DES SORCIERS" , "WITCH HAT ATELIER" , "ATELIER DES SORCIERS" , "LATELIER DES SORCIERS", "TONGARI BOSHI NO ATELIER"],

    ],

    // ============================================
    // PROTAGONIST
    // ============================================
    "Protagonist": [
        ["GOKU", "SON GOKU" , "KAKAROT" , "SONGOKU"],
        ["SAILOR MOON", "USAGI"],
        ["SHOYO"  , "HINATA"],
        ["YUZURU"  , "OTONASHI"],
        ["LIGHT", "KIRA"],
        ["KAZUTO", "KIRITO"],
        ["CID", "KAGENO"],
        ["SHIRO",  "SHIROU"],
        ["RIMURU" , "LIMULE"],
        ["SHIDOU" , "SHIDO"],
        ["AQUAMARINE" , "AQUA"],
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
        ["MUSTANG"],
        ["SAKURAGI", "HANAMICHI"],
        ["ALITA", "GALLY" , "YOKO"],
        ["ASTRO BOY", "ATOM"],
        ["TSUBASA", "OLIVIER"],
        ["BLACK JACK", "KURO"],
        ["SHINTARO", "JAGASAKI"],
        ["GOBLIN SLAYER" , "ORCBOLG"],
        ["LEGOSI", "LEGOSHI"],
        ["HACHIMAN" , "HIKIGAYA"],
        ["NANAHARA", "SHUYA"],
        ["OKAZAKI", "TOMOYA"],
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
        ["REVY", "LEVY" , "REBY", "LEVY MCGARDEN"],
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
        ["KASUMI MIWA", "KASUMI", "MIWA"],
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
        ["RE-DESTRO", "RE DESTRO", "REDESTRO", "RIKIYA YOTSUBASHI", "RIKIYA"],
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
        ["SOUNDMAN", "SANDMAN" , "SOUND MAN" , "SAND MAN"],
        ["D-I-S-C-O", "DISCO"],
        ["HERMES", "ERMES", "ERMES COSTELLO"],
        ["TOORU", "TORU"],
        ["SPORTS MAXX", "SPORTS MAX"],
        ["GEORGE 1", "GEORGE I", "GEORGE JOESTAR 1", "GEORGE JOESTAR I"],
        ["GEORGE 2", "GEORGE II", "GEORGE JOESTAR 2", "GEORGE JOESTAR II"],
        ["NDOUL", "N DOUL", "N'DOUL"],
        ["FF", "F.F", "FOO FIGHTERS"],
        ["DARBY", "D ARBY", "D'ARBY", "DANIEL", "DANIEL J DARBY"],
        ["SHIGECHI", "SHIGEKIYO", "SHIGEKIYO YANGU"],
    ],

    // ============================================
    // REBORN
    // ============================================
    "Reborn": [
        ["TSUNAYOSHI SAWADA", "SAWADA", "TSUNA", "VONGOLA DECIMO"],
        ["DEMON SPADE", "DAEMON SPADE" , "SPADE"],
        ["I PIN", "I-PIN" , "IPIN"],
        ["VONGOLA SETTIMO", "FABIO"],
        ["VIPER", "MAMMON"],
        ["MM", "M.M", "M M"],
    ],

    // ============================================
    // KPOP (bonus)
    // ============================================
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
    "Studio" : "Studio",
    "Gintama" : "Gintama",
    "BokuNoHeroAcademia": "MyHeroAcademia",
    "Jojo": "Jojo",
    "JojosBizarreAdventure": "Jojo",
    "Reborn": "Reborn",
};

// ============================================
// ⚠️ LES FAUX LIENS DE LA RÈGLE DU MOT ENTIER
// ============================================
//
// La règle du mot entier relie deux noms dès que l'un apparaît ENTIER dans
// l'autre. Elle rend le bon service presque toujours — « MIHAWK » et
// « DRACULE MIHAWK » sont la même personne, et aucun groupe n'a besoin de le
// dire. Mais elle se trompe quand deux PERSONNAGES DIFFÉRENTS partagent un
// mot : « GOKU » est un mot entier dans « GOKU BLACK », alors que Goku Black
// est Zamasu dans le corps de Goku, pas Goku.
//
// Citer Goku condamnait donc Goku Black, et l'inverse. Un groupe ne pouvait
// rien y faire : les groupes AJOUTENT des liens, ils n'en retirent pas. Cette
// table-ci en retire.
//
// ⚠️ Elle ne vaut QUE pour la règle du mot entier. Deux noms déclarés dans un
// même groupe restent liés quoi qu'il arrive — l'exception est ignorée pour
// eux. Sans quoi on pourrait écrire une contradiction et ne jamais le voir.
//
// ⚠️ Et elle est SYMÉTRIQUE : si A ne doit pas condamner B, B ne doit pas
// condamner A. Un sens seulement donnerait un jeu où l'ordre des réponses
// change ce qui reste à trouver.
//
// À n'utiliser que pour de vrais homonymes. Ce n'est pas un moyen de rattraper
// une entrée mal nommée : là, c'est l'entrée qu'il faut renommer.
const NE_PAS_LIER = {
    "Dbz": [
        // Goku Black s'écrit dans les deux ordres, et les deux contiennent
        // « GOKU » comme mot entier : il faut donc les deux paires.
        ["GOKU", "GOKU BLACK"],
        ["GOKU", "BLACK GOKU"],
    ],
};

// Les noms qui ne se lient QU'À L'IDENTIQUE : la règle du mot entier ne
// s'applique ni dans un sens ni dans l'autre. Le groupe d'alias, lui, continue
// de valoir — c'est la différence avec NE_PAS_LIER, qui ne coupe qu'une paire.
//
// ⚠️ « SHENRON » est le dragon de Dragon Ball, et il est devenu le MOT COMMUN
// d'une famille entière : les huit dragons maléfiques de GT (LI, I, SU, SAN,
// OMEGA, RYU, U, CHI, RYAN SHENRON) plus SUPER SHENRON de Super. Par la règle
// du mot entier, citer « SHENRON » les condamnait tous les dix d'un coup, et
// citer n'importe lequel d'entre eux condamnait SHENRON.
//
// ⚠️ Pourquoi PAS dix paires dans NE_PAS_LIER : il en aurait fallu une par
// dragon, et le onzième ajouté un jour dans bombdata.json serait repassé dans
// le trou, en silence — personne ne relit NE_PAS_LIER en ajoutant un nom. Ici
// la protection porte sur le mot commun lui-même : tout « X SHENRON » futur est
// couvert sans qu'on y touche.
//
// ⚠️ Et ça ne sépare PAS les dragons entre eux : « I SHENRON » n'est pas un mot
// entier dans « LI SHENRON » (pas de frontière entre L et I), la règle ne les
// reliait donc jamais. Ceux qui sont le MÊME personnage passent par un groupe
// d'alias, juste au-dessus.
const SEULEMENT_EXACT = {
    "Dbz": ["SHENRON"],
};

function seulementExact(theme) {
    const variantKey = THEME_MAPPING[theme] || theme;
    return SEULEMENT_EXACT[variantKey] || [];
}

// Les noms que `nom` ne doit PAS condamner par la règle du mot entier.
function liensInterdits(nom, theme) {
    const variantKey = THEME_MAPPING[theme] || theme;
    const paires = NE_PAS_LIER[variantKey] || [];
    const interdits = [];
    for (const paire of paires) {
        if (!paire.includes(nom)) continue;
        for (const autre of paire) if (autre !== nom) interdits.push(autre);
    }
    return interdits;
}

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
    const groupe = getVariantsToBlock(normalizedName, theme);
    const toBlock = new Set(groupe);

    // 🎬 Mode Manganime : exact match uniquement (pas de word boundary)
    // Sinon "YUGIOH" bloquerait "YUGIOH GX", "DRAGON BALL" bloquerait "DRAGON BALL Z", etc.
    const variantKey = THEME_MAPPING[theme] || theme;
    if (variantKey === 'Manganime') {
        return Array.from(toBlock);
    }

    // Les homonymes qu'on ne doit pas condamner au passage : voir NE_PAS_LIER.
    const interdits = liensInterdits(normalizedName, theme);

    // Un nom « seulement exact » ne tend aucun fil par la règle du mot entier.
    // ⚠️ On sort APRÈS avoir pris le groupe d'alias, pas avant : un nom protégé
    // peut très bien avoir des variantes d'orthographe, et elles doivent rester
    // bloquées. Ici c'est le mot entier qu'on coupe, pas les alias.
    const exacts = seulementExact(theme);
    if (exacts.includes(normalizedName)) return Array.from(toBlock);

    // Ajouter les noms qui contiennent le nom cité comme MOT COMPLET
    // (ex: "MONKEY D LUFFY" contient "LUFFY" comme mot → OK)
    // (ex: "GOTENKS" contient "GOTEN" mais PAS comme mot complet → IGNORÉ)
    for (const availableName of availableNames) {
        const upperAvailable = availableName.toUpperCase();
        if (upperAvailable === normalizedName) continue;

        // ⚠️ L'exception ne vaut que pour la règle du mot entier, jamais contre
        // un groupe : le `groupe.includes` garantit qu'un alias déclaré reste
        // bloqué même si quelqu'un l'inscrit par erreur dans NE_PAS_LIER.
        if (interdits.includes(upperAvailable) && !groupe.includes(upperAvailable)) continue;

        // L'AUTRE SENS, et il faut les deux : sans cette ligne, « SHENRON »
        // ne condamnerait plus les dix dragons, mais citer « OMEGA SHENRON »
        // condamnerait encore « SHENRON », qui y figure en mot entier.
        if (exacts.includes(upperAvailable) && !groupe.includes(upperAvailable)) continue;

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