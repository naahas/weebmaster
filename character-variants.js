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
        ["GINYU", "GINYUU"],
        ["KRILIN", "KRILLIN"],
        ["KIWI", "CUI"],
        ["PUAR", "PLUME"],
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
        ["RECOME", "RECOOME" , "RECOOM" , "REACUM"],
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
        ["IMU", "IM", "IMU SAMA"],
        ["JABRA", "JABURA"],
        ["CORAZON", "DONQUIXOTE ROSINANTE", "ROSINANTE"],
        ["GOLD ROGER", "GOL D ROGER", "GOL D. ROGER"],
        ["JAGUAR D SAUL", "JAGUAR D. SAUL"],
        ["MORGE", "MOHJI"],
        ["NYON", "GLORIOSA"],
        ["SHAKKY", "SHAKUYAKU"],
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
        ["OARS", "OARS JR", "OZ", "OZ JR"],
        ["KOHZA", "KOZA"],
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
        ["LEORIO", "LEOLIO", "LEOLIO PARADINAITO"],
        ["MELEOLON", "MELEORON"],
        ["BUROVUTA", "BLOSTER"],
        ["POUF", "SHAIAPOUF"],
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
        ["AGATSUMA ZENITSU", "ZENITSU AGATSUMA"],
        ["HASHIBIRA INOSUKE", "INOSUKE HASHIBIRA"],
    ],

    // ============================================
    // DEATH NOTE
    // ============================================
    "DeathNote": [
        ["KIRA", "LIGHT", "LIGHT YAGAMI"],
        ["MISA MISA", "AMANE MISA", "MISA"],
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
        ["ERIK", "COBRA"],
        ["DORANBOLT", "MEST", "MEST GRYDER"],
        ["HISUI", "JADE", "JADE FIORE"],
        ["PRECHT", "HADES"],
        ["SAWYER", "RACER"],
        ["ANGEL", "SORANO"],
        ["MAKAROV", "MAKAROV DREYAR", "MAKAROF"],
        ["LISANNA", "LISANNA STRAUSS", "LISANA", "LISANA STRAUSS"],
        ["EILEEN", "EILEEN BELSERION", "IRENE", "IRENE BELSERION"],
        ["LARCADE", "LARCADE DRAGNEEL", "RAHKEID"],
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
    "AttaqueDesTitans": "Snk",
    "Pokemon": "Pokemon",
    "Bleach": "Bleach",
    "DemonSlayer": "DemonSlayer",
    "KimetsuNoYaiba": "DemonSlayer",
    "DeathNote": "DeathNote",
    "FairyTail": "FairyTail",
    "JujutsuKaisen": "JujutsuKaisen",
    "Jjk": "JujutsuKaisen",
    "MyHeroAcademia": "MyHeroAcademia",
    "Mha": "MyHeroAcademia",
    "BokuNoHeroAcademia": "MyHeroAcademia",
    "Jojo": "Jojo",
    "JojosBizarreAdventure": "Jojo",
    "Reborn": "Reborn",
    "Kpop": "Kpop",
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