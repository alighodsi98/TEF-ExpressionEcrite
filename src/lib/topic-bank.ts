import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Official TEF Canada topics from Sujets.txt
// Section A: Fait divers (continue the starter sentence into a news report)
// Section B: Lettre argumentative (write a letter to the editor)
// ---------------------------------------------------------------------------
export const SEED_TOPICS: {
  section: "A" | "B";
  topic: string;
  starterSentence?: string;
  context?: string;
  category: string;
}[] = [
  // ---- Section A : Fait divers ----
  { section: "A", topic: "Un homme s'endort à l'arrière de sa voiture", starterSentence: "Un homme s'endort à l'arrière de sa voiture ; à son réveil, quelqu'un d'autre est en train de la conduire.", category: "fait_divers" },
  { section: "A", topic: "Un Belge pirate la billetterie d'une compagnie aérienne", starterSentence: "À Bruxelles, un jeune Belge de 25 ans pirate la billetterie d'une compagnie aérienne et obtient des billets pour New York avec son ami(e) ; à son retour…", category: "fait_divers" },
  { section: "A", topic: "Mehdi et la découverte étrange près du lac", starterSentence: "Mehdi, un septuagénaire, se promenait avec son chien près du lac quand son chien a fait une découverte étrange.", category: "fait_divers" },
  { section: "A", topic: "Le couple centenaire révèle un secret", starterSentence: "Un couple — elle 106 ans, lui 110 ans — se marie et révèle un secret qu'ils gardaient depuis des années.", category: "fait_divers" },
  { section: "A", topic: "Un sac de sport rempli de bijoux", starterSentence: "Un homme se promène en ville et trouve un sac de sport rempli de bijoux.", category: "fait_divers" },
  { section: "A", topic: "Le facteur filmé en train de jeter une lettre", starterSentence: "Un facteur a voulu jeter une lettre à la poubelle, mais une personne l'a filmé.", category: "fait_divers" },
  { section: "A", topic: "Tito est vivant", starterSentence: "Une famille déménageant perd son chat ; plusieurs années plus tard, ils reçoivent une nouvelle surprenante : « Tito est vivant ».", category: "fait_divers" },
  { section: "A", topic: "Un sac de cadeaux sous un arbre", starterSentence: "Un homme rentrant chez lui pour fêter Noël (ou le Nouvel An) trouve sous un arbre un sac plein de cadeaux avec une liste de noms.", category: "fait_divers" },
  { section: "A", topic: "La lettre de 1950", starterSentence: "Le maire d'une ville de France reçoit une lettre datée de 1950, écrite par sa grand-mère ; le contenu change sa vie.", category: "fait_divers" },
  { section: "A", topic: "La robe du bal de fin d'année", starterSentence: "Une jeune femme, en route pour le bal de fin d'année, porte une jolie robe mais découvre un défaut (trou ou tache) dessus à la dernière minute ; elle a une idée originale.", category: "fait_divers" },
  { section: "A", topic: "Le jeune conducteur devient riche", starterSentence: "Un jeune conducteur perd le contrôle de son véhicule et percute le mur d'un vieux bâtiment qui s'écroule ; le titre annonce qu'il devient riche.", category: "fait_divers" },
  { section: "A", topic: "Le faux chauffeur de transport public", starterSentence: "Faux chauffeur, un homme utilise son véhicule pour le transport public.", category: "fait_divers" },
  { section: "A", topic: "Le singe dans le supermarché", starterSentence: "Un singe qui est entré dans un supermarché et a causé beaucoup de dégâts.", category: "fait_divers" },
  { section: "A", topic: "Le légume étrange au supermarché", starterSentence: "Une femme trouve un légume étrange dans le rayon fruits et légumes d'un supermarché ; elle demande à voir le responsable pour lui montrer sa découverte…", category: "fait_divers" },
  { section: "A", topic: "La fillette retrouvée au zoo", starterSentence: "Mignon ! Une fillette de 8 ans est retrouvée allongée sur l'herbe d'un zoo.", category: "fait_divers" },
  { section: "A", topic: "L'homme disparu devenu star en Chine", starterSentence: "Hier soir, un homme canadien s'est rendu à la police de son pays après 10 ans de disparition ; on le croyait mort. En réalité, il est devenu une véritable star en Chine.", category: "fait_divers" },
  { section: "A", topic: "Le couple oublie quelqu'un", starterSentence: "Un couple de retour de vacances, en s'arrêtant pour faire le plein, aperçoit qu'il a oublié quelqu'un.", category: "fait_divers" },
  { section: "A", topic: "Le mariage au marathon de Montréal", starterSentence: "Un couple veut célébrer son mariage au marathon de Montréal, mais les organisateurs ne voulaient pas que les coureurs soutiennent le couple.", category: "fait_divers" },
  { section: "A", topic: "Le voyage gagné à un concours télévisé", starterSentence: "Deux amis ont gagné un voyage lors d'un concours télévisé mais n'ont pas répondu présents à la réception du cadeau.", category: "fait_divers" },
  { section: "A", topic: "L'anniversaire du restaurant de pizza", starterSentence: "Un chef cuisinier a eu une idée géniale en célébrant le 4ème anniversaire de son restaurant de pizza !", category: "fait_divers" },
  { section: "A", topic: "Le chauffeur de moto arrêté par la police", starterSentence: "Un chauffeur conduisait sa moto avec une seule main : il a été arrêté par la police ; vous devinez ce qu'il cachait dans l'autre main.", category: "fait_divers" },
  { section: "A", topic: "Le voleur coincé par le toit", starterSentence: "Un voleur est rentré par le toit dans un magasin de sport ; il y est resté coincé.", category: "fait_divers" },
  { section: "A", topic: "24 000 lettres au domicile d'un facteur", starterSentence: "24 000 lettres ont été retrouvées au domicile d'un agent de la poste au Japon.", category: "fait_divers" },
  { section: "A", topic: "La dame de 85 ans améliore la maison de retraite", starterSentence: "Au Royaume-Uni, une dame âgée de 85 ans vivant dans une maison de retraite décide d'améliorer les conditions de vie des pensionnaires ; elle propose une idée originale.", category: "fait_divers" },
  { section: "A", topic: "Le dinosaure à l'aéroport de Tokyo", starterSentence: "Tokyo, Japon : le personnel a remarqué un voyageur pas comme les autres — un dinosaure traînant une valise en train d'embarquer.", category: "fait_divers" },
  { section: "A", topic: "La table au bord de la mer", starterSentence: "Un couple a réservé une table au bord de la mer ; à peine installé, la météo devient capricieuse.", category: "fait_divers" },
  { section: "A", topic: "Le village australien privé d'internet", starterSentence: "En Australie, les habitants d'un village sont privés d'internet ; la police est surprise quand elle découvre le coupable.", category: "fait_divers" },
  { section: "A", topic: "L'Irlandais cherche l'amour sur une affiche", starterSentence: "Un Irlandais décide de trouver l'amour sur une affiche publicitaire.", category: "fait_divers" },
  { section: "A", topic: "L'artiste s'allonge dans les sites touristiques", starterSentence: "Une artiste s'est allongée à plat ventre dans plusieurs sites touristiques ; finalement les autorités municipales ont dû intervenir.", category: "fait_divers" },
  { section: "A", topic: "La machine à café livrée", starterSentence: "Une jeune fille qui se fait livrer une machine à café trouve quelque chose à l'intérieur et appelle la police.", category: "fait_divers" },
  { section: "A", topic: "La vieille femme endormie à l'autobus", starterSentence: "Une vieille femme attendait l'autobus dans un village des environs de Québec ; elle s'est endormie et s'est réveillée dans une situation incroyable.", category: "fait_divers" },
  { section: "A", topic: "La bouteille jetée à la mer retrouvée", starterSentence: "Un homme avait jeté une bouteille à la mer il y a dix ans ; elle a été retrouvée la semaine dernière.", category: "fait_divers" },
  { section: "A", topic: "Le perroquet au bec artificiel", starterSentence: "Brésil : un perroquet reçoit un bec artificiel pour pouvoir manger normalement.", category: "fait_divers" },
  { section: "A", topic: "Le mari empêche l'avion de décoller", starterSentence: "Pendant les vacances, un couple se dispute et la femme décide de rentrer ; le mari tente d'empêcher l'avion de décoller.", category: "fait_divers" },
  { section: "A", topic: "L'homme armé dans le magasin", starterSentence: "Un homme entre avec une arme dans un magasin après l'heure de fermeture, mais une personne s'y trouve encore.", category: "fait_divers" },
  { section: "A", topic: "Le jeune garçon sauvé de la noyade", starterSentence: "Un jeune garçon en train de se noyer est sauvé.", category: "fait_divers" },
  { section: "A", topic: "Les anciens combattants à la plage de Normandie", starterSentence: "Deux anciens combattants canadiens se retrouvent par hasard sur la plage de Normandie après des décennies.", category: "fait_divers" },
  { section: "A", topic: "Le prisonnier évadé filmé au centre commercial", starterSentence: "Un prisonnier évadé est filmé alors qu'il achète et mange des sucreries dans un centre commercial ; les vidéos sont publiées sur les réseaux sociaux et il est identifié.", category: "fait_divers" },
  { section: "A", topic: "L'adolescent enfermé dans la bibliothèque", starterSentence: "Un adolescent de 15 ans n'a pas entendu la fermeture de la bibliothèque et s'y est retrouvé enfermé.", category: "fait_divers" },
  { section: "A", topic: "Les écoliers et la découverte dans la forêt", starterSentence: "Deux écoliers passionnés d'histoire creusent un trou dans la forêt urbaine et font une découverte inattendue.", category: "fait_divers" },
  { section: "A", topic: "Le petit garçon et la banane au supermarché", starterSentence: "Un petit garçon est seul devant le rayon de fruits d'un supermarché et prend une banane à manger ; vous êtes témoin et vous imaginez la suite.", category: "fait_divers" },
  { section: "A", topic: "La jeune fille filme sa grand-mère", starterSentence: "Une jeune fille passionnée de cinéma filme sa grand-mère ; quelques jours après avoir publié la vidéo en ligne…", category: "fait_divers" },
  { section: "A", topic: "La femme repartie seule", starterSentence: "Une femme est sortie se promener avec sa compagne, mais elle est repartie seule, sans elle…", category: "fait_divers" },
  { section: "A", topic: "L'œuvre d'art brisée à l'exposition", starterSentence: "Un visiteur d'une exposition d'art contemporain fait tomber une œuvre en verre d'une valeur d'environ 20 000 dollars.", category: "fait_divers" },
  { section: "A", topic: "L'enfant détecte un vol dans une bijouterie", starterSentence: "Un enfant de 5 ans détecte un vol dans une bijouterie ; la police résout l'affaire grâce à son cri.", category: "fait_divers" },
  { section: "A", topic: "Le jeune homme rend sa mère fière", starterSentence: "Un jeune homme accomplit en moins d'une semaine quelque chose qui rend sa mère malade fière.", category: "fait_divers" },
  { section: "A", topic: "Les députés sauvent une femme qui se noie", starterSentence: "Deux députés sauvent une femme en train de se noyer dans le lac de Nice, mais ils ne s'attardent pas pour attendre sa réaction.", category: "fait_divers" },
  { section: "A", topic: "Le vol dans la bijouterie", starterSentence: "Un vol survient dans une bijouterie, mais le propriétaire ne contacte pas la police…", category: "fait_divers" },
  { section: "A", topic: "Le garçon de 13 ans sauve ses camarades", starterSentence: "Un garçon de 13 ans sauve la vie de ses camarades en prenant la place du conducteur.", category: "fait_divers" },
  { section: "A", topic: "L'invité bizarre sur le balcon", starterSentence: "Une jeune femme trouve un invité bizarre sur son balcon.", category: "fait_divers" },
  { section: "A", topic: "La femme de 80 ans change de vie", starterSentence: "Une femme de 80 ans qui vivait avec sa fille décide de changer de vie pour plus de liberté.", category: "fait_divers" },
  { section: "A", topic: "L'avion change d'itinéraire pour Bali", starterSentence: "Un avion prévu d'atterrir à Bali change d'itinéraire 30 minutes avant son arrivée à cause d'un événement inattendu.", category: "fait_divers" },
  { section: "A", topic: "La femme se noie dans la rivière", starterSentence: "Deux gardes voient une femme se noyer dans une rivière, mais quand ils tentent de la sauver, une réaction étrange survient.", category: "fait_divers" },
  { section: "A", topic: "Le gain au loto et le problème", starterSentence: "Un couple gagne 300 dollars au loto et un petit problème survient soudainement.", category: "fait_divers" },
  { section: "A", topic: "L'accident du fourgon blindé", starterSentence: "Un fourgon blindé banalisé de transport de fonds a fait un accident et des sacs d'argent se retrouvent par tous dans la route.", category: "fait_divers" },
  { section: "A", topic: "Le faux contrôleur SNCF", starterSentence: "Un homme de 65 ans vu en uniforme de contrôleur SNCF en train de contrôler les billets des passagers d'une façon irrégulière.", category: "fait_divers" },
  { section: "A", topic: "L'infirmière retrouve son père", starterSentence: "Une infirmière a trouvé son père après 30 ans à l'hôpital…", category: "fait_divers" },
  { section: "A", topic: "Le chirurgien quitte son travail", starterSentence: "Un chirurgien a quitté son travail après une intervention…", category: "fait_divers" },
  { section: "A", topic: "Les pilotes endormis en vol", starterSentence: "Deux pilotes s'endorment sur un vol San Diego–Minnesota, atterrissage retardé.", category: "fait_divers" },
  { section: "A", topic: "Le tour du monde à pied", starterSentence: "Une jeune australienne décide de faire le tour du monde à pied pour une bonne cause.", category: "fait_divers" },
  { section: "A", topic: "La coupure d'électricité au supermarché", starterSentence: "Une coupure d'électricité dans un supermarché, c'est la panique.", category: "fait_divers" },
  { section: "A", topic: "La découverte du chirurgien", starterSentence: "Un chirurgien fait une découverte inattendue en ouvrant l'estomac d'un patient.", category: "fait_divers" },
  { section: "A", topic: "Le Britannique réveillé par un renard", starterSentence: "Grosse frayeur à Londres : alors qu'il rentrait d'une soirée bien arrosée, un jeune britannique s'est endormi sur un banc ; une heure plus tard, il a eu la surprise de se faire réveiller par un renard qui fouillait dans son sac à dos.", category: "fait_divers" },
  { section: "A", topic: "La petite fille au zoo", starterSentence: "Une petite fille accompagnée de ses parents passe une agréable journée dans un zoo. Fatiguée, elle dort pour un moment. Quelle surprise à son réveil… imaginez la suite.", category: "fait_divers" },
  { section: "A", topic: "La mariée en autostop", starterSentence: "Une foule d'automobilistes allait à Montréal ; sur leur chemin, ils rencontraient une fille portant une robe de mariage qui faisait l'autostop à côté d'une voiture en arrêt.", category: "fait_divers" },
  { section: "A", topic: "La navigatrice sauvée par des dauphins", starterSentence: "Une navigatrice sauvée par des dauphins. Laura Metzer effectuait un voyage autour du monde en bateau ; elle ne s'imaginait pas qu'elle allait faire une rencontre inattendue.", category: "fait_divers" },
  { section: "A", topic: "Le chien au volant du camion", starterSentence: "Drôle de chauffeur. Vendredi après-midi, des témoins ont eu la surprise de voir un chien au volant d'un camion sur une route de Gaspésie, dans l'est du Québec.", category: "fait_divers" },
  { section: "A", topic: "L'ours polaire dans le bateau", starterSentence: "Un passager inhabituel : les passagers d'un bateau ont eu un choc pendant leur croisière lorsqu'ils ont vu un gros ours polaire passer la tête par la fenêtre de la salle à manger.", category: "fait_divers" },
  { section: "A", topic: "Le Canadien disparu depuis dix ans", starterSentence: "Un canadien disparu depuis dix ans fait soudainement son apparition.", category: "fait_divers" },
  { section: "A", topic: "Le visage bleu après la pizzeria", starterSentence: "Après un dîner dans une pizzeria, une jeune femme s'est réveillée le lendemain avec un visage tout bleu.", category: "fait_divers" },
  { section: "A", topic: "Le faux dentiste autrichien", starterSentence: "Orage de dents ! Vienne — un garagiste autrichien qui se faisait passer pour un dentiste a soigné soixante et un patients en cinq semaines et en a blessé quatorze avant d'être démasqué.", category: "fait_divers" },
  { section: "A", topic: "La maman surprise au parc", starterSentence: "Une jeune maman a amené son bébé au parc dans une poussette ; elle était surprise…", category: "fait_divers" },
  { section: "A", topic: "L'homme disparu au match de foot", starterSentence: "Un homme disparu lors d'un match de foot dans un stade est réapparu après 11 ans.", category: "fait_divers" },
  { section: "A", topic: "Mauvaise blague sur le bureau", starterSentence: "Mauvaise blague… Tom, 25 ans, s'est endormi sur son bureau ; ses collègues ont profité de ça pour s'amuser et prendre des photos avec lui, et ils les ont mises sur Internet.", category: "fait_divers" },
  { section: "A", topic: "Le patron à la retraite", starterSentence: "Un patron qui part à la retraite fait une surprise à ses employés.", category: "fait_divers" },
  { section: "A", topic: "L'employé sauve des vies au centre commercial", starterSentence: "Un employé d'un centre commercial a sauvé la vie de plusieurs personnes.", category: "fait_divers" },
  { section: "A", topic: "La biche au supermarché", starterSentence: "Une biche poursuivie par un groupe de chasseurs trouve refuge dans un supermarché.", category: "fait_divers" },
  { section: "A", topic: "Les souris à l'opéra", starterSentence: "Des souris ont envahi l'opéra et ont provoqué la panique.", category: "fait_divers" },
  { section: "A", topic: "La valise et le diamant retrouvé", starterSentence: "Une femme surprise par sa valise. Le diamant retrouvé !", category: "fait_divers" },
  { section: "A", topic: "Le motard oublie sa femme", starterSentence: "Un couple de motards de retour de leur séjour en Allemagne s'arrête dans une pompe d'essence puis reprend sa route. Après 120 km, l'homme remarque que la femme n'est plus sur la moto.", category: "fait_divers" },
  { section: "A", topic: "Le Finlandais distribue des pièces d'euro", starterSentence: "Un Finlandais distribuait des pièces d'euro pour fêter la fin de sa vie active ; un passant pensait que c'était une escroquerie et a appelé la police.", category: "fait_divers" },
  { section: "A", topic: "L'enveloppe envolée dans la voiture de sport", starterSentence: "Un jeune homme essayait une voiture de sport sur l'autoroute. La surprise : l'enveloppe qui contenait l'argent pour acheter la voiture s'est envolée par la fenêtre — 46 billets de 500 euros.", category: "fait_divers" },
  { section: "A", topic: "Les retraités gagnent 50 millions au loto", starterSentence: "Un couple de retraités a gagné 50 millions d'euros au loto ; ils ont décidé de faire une surprise à l'école du quartier.", category: "fait_divers" },
  { section: "A", topic: "Le cycliste prend un raccourci", starterSentence: "Un coureur cycliste qui est arrivé en retard a décidé de prendre un raccourci.", category: "fait_divers" },
  { section: "A", topic: "L'évasion de prison à Genève", starterSentence: "À Genève, un homme a échappé d'une prison à l'aide d'une employée. Mais cette dernière n'est pas n'importe qui…", category: "fait_divers" },
  { section: "A", topic: "La touriste nage après le bateau", starterSentence: "Une touriste anglaise de 65 ans tente de rejoindre son mari parti en croisière sans elle, en nageant !", category: "fait_divers" },
  { section: "A", topic: "Raoul appelle une émission télé", starterSentence: "Un vieil homme de 95 ans qui s'appelle Raoul appelle une émission télé et leur dit qu'il se sent seul ; imaginez ce que l'animateur fait pour l'aider.", category: "fait_divers" },
  { section: "A", topic: "Les enfants pirates et la découverte", starterSentence: "Deux enfants passionnés par les pirates font une découverte inattendue aux trous des jardins.", category: "fait_divers" },
  { section: "A", topic: "L'enfant moqué retrouve ses camarades", starterSentence: "Un enfant qui dans son enfance était le sujet de moquerie de ses camarades, 30 ans plus tard, lors d'une réunion avec les camarades…", category: "fait_divers" },
  { section: "A", topic: "Le couple japonais dans l'hôtel de luxe", starterSentence: "Un jeune couple japonais dans un hôtel de luxe avec des bruits ou bien une intrusion animalière.", category: "fait_divers" },
  { section: "A", topic: "Le zoo au Cameroun et les pompiers", starterSentence: "Dans un zoo au Cameroun, un jeune artiste a eu un accident et il a appelé les pompiers ; ces derniers sont accueillis par des animaux domestiques.", category: "fait_divers" },
  { section: "A", topic: "L'homme coincé dans la vitrine", starterSentence: "Un homme coincé dans une vitrine de bijouterie.", category: "fait_divers" },
  { section: "A", topic: "Le tableau trouvé dans une poubelle", starterSentence: "Une dame qui a trouvé un tableau dans une poubelle s'est rendu compte qu'elle avait gagné le gros lot.", category: "fait_divers" },
  { section: "A", topic: "Le voleur tête en l'air", starterSentence: "Un voleur tête en l'air.", category: "fait_divers" },
  { section: "A", topic: "La coupe de tennis volée", starterSentence: "Une coupe de tennis volée lors d'un tournoi.", category: "fait_divers" },
  { section: "A", topic: "La découverte du directeur d'université", starterSentence: "Un directeur d'une université a fait une découverte pour que les étudiants ne puissent pas copier aux examens.", category: "fait_divers" },
  { section: "A", topic: "La chose étrange dans la voiture de David", starterSentence: "David a découvert quelque chose d'étrange dans sa voiture en allant au travail.", category: "fait_divers" },
  { section: "A", topic: "La surprise dans la boîte aux lettres", starterSentence: "Surprise dans une boîte aux lettres.", category: "fait_divers" },

  // ---- Section B : Lettre argumentative ----
  { section: "B", topic: "L'arrêt du tabac : le tabac tue, il faut l'interdire", context: "Suite à un article paru dans votre journal sur les dangers du tabac, vous écrivez au rédacteur en chef pour défendre votre opinion sur l'interdiction du tabac, à l'aide de trois arguments étayés par des exemples concrets.", category: "sante" },
  { section: "B", topic: "La gratuité des livres permet une diffusion de la culture", context: "Votre journal a publié un article sur la gratuité des livres. Vous écrivez à la rédaction pour défendre l'idée que la culture doit être accessible à tous, en illustrant votre propos par trois arguments.", category: "culture" },
  { section: "B", topic: "Dans 20 ans, les gens ne liront plus de livres", context: "Un éditorialiste affirme que dans 20 ans, les gens ne liront plus de livres. Vous écrivez au rédacteur en chef pour donner votre point de vue, étayé par trois arguments.", category: "culture" },
  { section: "B", topic: "Notre mode de vie est influencé par les célébrités et la publicité", context: "Votre journal affirme que notre mode de vie est très influencé par les célébrités et la publicité. Vous écrivez à la rédaction pour exprimer votre position.", category: "societe" },
  { section: "B", topic: "La discipline s'apprend à la maison et non à l'école", context: "Un article récent soutient que la discipline s'apprend avant tout à la maison. Vous écrivez au rédacteur en chef pour défendre ou contester cette affirmation à l'aide de trois arguments.", category: "education" },
  { section: "B", topic: "Les deux-roues présentent un vrai danger en ville", context: "Votre journal a publié un article sur les dangers des deux-roues en ville. Vous écrivez à la rédaction pour donner votre opinion.", category: "transport" },
  { section: "B", topic: "Apprendre un instrument de musique devrait être obligatoire", context: "Un récent éditorial propose de rendre l'apprentissage d'un instrument de musique obligatoire à l'école. Vous écrivez au rédacteur en chef pour défendre ou contester cette idée.", category: "education" },
  { section: "B", topic: "Les avions sont polluants, on devrait les interdire", context: "Suite à un article sur la pollution causée par l'aviation, vous écrivez au rédacteur en chef pour défendre votre position sur l'interdiction des avions.", category: "environnement" },
  { section: "B", topic: "Les sites de rencontres éloignent les gens", context: "Un éditorialiste affirme que les sites de rencontres ne font qu'éloigner les gens. Vous écrivez à la rédaction pour donner votre avis.", category: "societe" },
  { section: "B", topic: "Il faut limiter l'ouverture des commerces pour éviter la surconsommation", context: "Votre journal propose de limiter l'ouverture des commerces pour lutter contre la surconsommation. Vous écrivez au rédacteur en chef pour défendre votre opinion.", category: "societe" },
  { section: "B", topic: "Les élèves passent trop de temps à l'école", context: "Un article récent affirme que les élèves passent trop de temps à l'école. Vous écrivez à la rédaction pour donner votre point de vue à l'aide de trois arguments.", category: "education" },
  { section: "B", topic: "L'enseignement de l'art et de la musique est une perte de temps", context: "Votre journal a publié un éditorial affirmant que l'enseignement de l'art et de la musique à l'école est une perte de temps. Vous écrivez à la rédaction pour défendre votre position.", category: "education" },
  { section: "B", topic: "Il faudrait interdire la sortie nocturne aux mineurs", context: "Suite à un débat sur la sécurité des mineurs la nuit, vous écrivez au rédacteur en chef pour défendre ou contester l'idée d'interdire les sorties nocturnes aux mineurs non accompagnés.", category: "societe" },
  { section: "B", topic: "Les restaurants devraient privilégier les menus sans contact", context: "Un article propose que les restaurants adoptent des menus sans contact physique. Vous écrivez au rédacteur en chef pour donner votre avis.", category: "technologie" },
  { section: "B", topic: "On ne peut plus vivre heureux sans travailler", context: "Votre journal affirme que dans le monde actuel, on ne peut plus vivre heureux sans travailler. Vous écrivez à la rédaction pour défendre ou contester cette affirmation.", category: "travail" },
  { section: "B", topic: "Les professeurs devraient utiliser smartphones et tablettes en classe", context: "Un éditorialiste propose que les professeurs utilisent les smartphones et tablettes en classe pour mieux intéresser leurs élèves. Vous écrivez au rédacteur en chef pour donner votre position.", category: "education" },
  { section: "B", topic: "Avec internet et les réseaux sociaux, on est devenu une marchandise", context: "Votre journal affirme qu'avec internet et les réseaux sociaux, les individus sont devenus des marchandises. Vous écrivez à la rédaction pour défendre votre point de vue.", category: "technologie" },
  { section: "B", topic: "Les parents n'ont aucune autorité sur leurs enfants", context: "Un article récent affirme que les parents n'ont plus aucune autorité sur leurs enfants. Vous écrivez au rédacteur en chef pour donner votre opinion.", category: "famille" },
  { section: "B", topic: "Donner des cours d'informatique aux personnes âgées n'est pas utile", context: "Votre journal a publié un éditorial affirmant que l'enseignement de l'informatique aux personnes âgées est inutile. Vous écrivez à la rédaction pour défendre votre position.", category: "technologie" },
  { section: "B", topic: "Il faut donner les smartphones aux personnes âgées", context: "Un récent article plaide en faveur de la distribution de smartphones aux personnes âgées. Vous écrivez au rédacteur en chef pour donner votre avis.", category: "technologie" },
  { section: "B", topic: "Les postes importants doivent être accordés aux plus de 50 ans", context: "Votre journal affirme que les postes les plus importants doivent être accordés aux plus de 50 ans. Vous écrivez à la rédaction pour défendre ou contester cette idée.", category: "travail" },
  { section: "B", topic: "Les jeunes ne s'intéressent pas au travail manuel", context: "Un éditorialiste affirme que les jeunes ne s'intéressent plus au travail manuel. Vous écrivez au rédacteur en chef pour donner votre point de vue.", category: "travail" },
  { section: "B", topic: "L'école obligatoire tue la motivation des élèves", context: "Votre journal a publié un article affirmant que l'obligation scolaire tue la motivation des élèves. Vous écrivez à la rédaction pour défendre votre opinion.", category: "education" },
  { section: "B", topic: "Le gouvernement impose la gratuité des transports en commun", context: "Suite à la décision du gouvernement de rendre les transports en commun gratuits, vous écrivez au rédacteur en chef pour donner votre avis.", category: "transport" },
  { section: "B", topic: "Il faudrait réintroduire les véhicules à traction animale", context: "Un article propose de réintroduire les véhicules à traction animale pour lutter contre la pollution. Vous écrivez au rédacteur en chef pour défendre ou contester cette idée.", category: "environnement" },
  { section: "B", topic: "Le travail à distance devrait être obligatoire", context: "Votre journal affirme que le télétravail devrait être obligatoire et le déplacement occasionnel en cas de nécessité. Vous écrivez à la rédaction pour donner votre position.", category: "travail" },
  { section: "B", topic: "Le mariage n'est plus comme avant", context: "Un récent éditorial affirme que le mariage n'est plus comme avant. Vous écrivez au rédacteur en chef pour défendre votre point de vue à l'aide de trois arguments.", category: "societe" },
  { section: "B", topic: "La vie est trop courte pour réaliser nos rêves", context: "Votre journal a publié un article affirmant que la vie est trop courte, impossible de réaliser nos rêves. Vous écrivez à la rédaction pour donner votre opinion.", category: "societe" },
  { section: "B", topic: "Avec une société d'écrans, nos jeunes ne liront plus les livres", context: "Un éditorialiste affirme qu'avec la société des écrans et des images, les jeunes ne liront plus les livres. Vous écrivez au rédacteur en chef pour défendre votre point de vue.", category: "culture" },
  { section: "B", topic: "Pour être en bonne santé, il faut être végétarien", context: "Votre journal affirme que pour être en bonne santé, il faut être végétarien. Vous écrivez à la rédaction pour défendre ou contester cette affirmation.", category: "sante" },
  { section: "B", topic: "Acheter de nouveaux vêtements est un acte irresponsable", context: "Un article récent affirme que l'achat de nouveaux vêtements est un acte irresponsable. Vous écrivez au rédacteur en chef pour donner votre avis.", category: "environnement" },
  { section: "B", topic: "La pollution s'est propagée, il est inutile de protéger notre santé", context: "Votre journal a publié un éditorial affirmant que la pollution s'étant propagée, il est inutile de protéger notre santé. Vous écrivez à la rédaction pour défendre votre position.", category: "environnement" },
  { section: "B", topic: "Il faut interdire les zoos pour animaux", context: "Suite à un article sur les conditions de vie des animaux en captivité, vous écrivez au rédacteur en chef pour défendre l'interdiction des zoos.", category: "societe" },
  { section: "B", topic: "La télévision favorise le développement du génie", context: "Un éditorialiste affirme que la télévision favorise le développement du génie. Vous écrivez à la rédaction pour donner votre point de vue.", category: "culture" },
  { section: "B", topic: "Apprenons correctement nos langues maternelles", context: "Votre journal a publié un article intitulé « Stop aux langues étrangères ! Apprenons correctement nos langues maternelles. » Vous écrivez à la rédaction pour défendre ou contester cette position.", category: "education" },
  { section: "B", topic: "La télévision, c'est l'appauvrissement intellectuel", context: "Un récent éditorial affirme que la télévision est source d'appauvrissement intellectuel. Vous écrivez au rédacteur en chef pour défendre votre opinion.", category: "culture" },
  { section: "B", topic: "Les célibataires sont plus heureux que les personnes mariées", context: "Votre journal affirme que les célibataires sont plus heureux que les personnes mariées. Vous écrivez à la rédaction pour défendre ou contester cette affirmation.", category: "societe" },
  { section: "B", topic: "Il faut généraliser la vidéosurveillance pour prévenir les crimes", context: "Pour prévenir les crimes, votre journal propose de généraliser la vidéosurveillance, y compris à domicile. Vous écrivez au rédacteur en chef pour donner votre avis.", category: "societe" },
  { section: "B", topic: "Les réseaux sociaux détruisent les relations humaines", context: "Un article affirme que les réseaux sociaux détruisent les relations humaines. Vous écrivez à la rédaction pour défendre votre point de vue à l'aide de trois arguments.", category: "technologie" },
  { section: "B", topic: "Le gouvernement doit prendre des décisions plus efficaces contre la pollution", context: "Votre journal affirme que pour lutter contre la pollution, le gouvernement doit prendre des décisions plus efficaces. Vous écrivez au rédacteur en chef pour donner votre position.", category: "environnement" },
  { section: "B", topic: "Il faut limiter les voyages internationaux pour la planète", context: "Pour le bien de la planète, votre journal propose de limiter les voyages internationaux. Vous écrivez à la rédaction pour défendre ou contester cette idée.", category: "environnement" },
  { section: "B", topic: "On ne peut pas se faire de vrais amis sur Internet", context: "Un éditorialiste affirme qu'on ne peut pas se faire de vrais amis sur Internet. Vous écrivez au rédacteur en chef pour donner votre opinion.", category: "technologie" },
  { section: "B", topic: "Les écoles devraient permettre aux élèves d'évaluer leurs professeurs", context: "Votre journal a publié un article proposant que les élèves évaluent leurs professeurs. Vous écrivez à la rédaction pour défendre ou contester cette idée.", category: "education" },
  { section: "B", topic: "Le talent n'est plus nécessaire pour devenir une star", context: "De nos jours, le talent n'est plus nécessaire pour devenir une star. Vous écrivez au rédacteur en chef pour défendre votre point de vue à l'aide de trois arguments.", category: "societe" },
  { section: "B", topic: "Addiction aux réseaux sociaux : les adultes aussi", context: "Votre journal affirme que l'addiction aux réseaux sociaux ne concerne pas que les jeunes, mais aussi les adultes. Vous écrivez à la rédaction pour donner votre avis.", category: "technologie" },
  { section: "B", topic: "Il faut interdire la publicité des produits sucrés", context: "Un article récent propose d'interdire la publicité des produits sucrés. Vous écrivez au rédacteur en chef pour défendre ou contester cette proposition.", category: "sante" },
  { section: "B", topic: "Les enfants apprennent plus sur Internet qu'à l'école", context: "Votre journal affirme que les enfants apprennent plus sur Internet qu'à l'école. Vous écrivez à la rédaction pour défendre ou contester cette affirmation.", category: "education" },
  { section: "B", topic: "L'expérience de la vie et des voyages est plus précieuse que les études", context: "Un éditorialiste affirme que l'expérience de la vie et des voyages est plus précieuse que les études. Vous écrivez au rédacteur en chef pour donner votre point de vue.", category: "education" },
  { section: "B", topic: "Les compétitions sportives sont de moins en moins intéressantes", context: "Votre journal a publié un article affirmant que les compétitions sportives sont de moins en moins intéressantes. Vous écrivez à la rédaction pour défendre votre opinion.", category: "sport" },
  { section: "B", topic: "Il faut promouvoir la valeur du français écrit chez les jeunes", context: "Un récent éditorial plaide en faveur de la promotion du français écrit chez les jeunes. Vous écrivez au rédacteur en chef pour défendre ou contester cette idée.", category: "education" },
  { section: "B", topic: "L'utilisation d'internet nous rend isolé de la société", context: "Votre journal affirme que « l'utilisation d'internet (les réseaux sociaux) nous rend isolé de la société. » Vous écrivez à la rédaction pour donner votre position.", category: "technologie" },
  { section: "B", topic: "Si la machine prend le pouvoir, elle sera un danger pour l'humanité", context: "Un éditorialiste affirme que si la machine prend le pouvoir, elle sera un danger pour l'humanité. Vous écrivez au rédacteur en chef pour défendre votre point de vue.", category: "technologie" },
  { section: "B", topic: "Les robots et la technologie vont tous nous mettre au chômage", context: "Votre journal affirme que les robots et la technologie vont tous nous mettre au chômage. Vous écrivez à la rédaction pour défendre ou contester cette affirmation.", category: "technologie" },
  { section: "B", topic: "On n'a pas besoin d'apprendre l'écriture à la main aux enfants", context: "Un article affirme qu'avec l'ordinateur, on n'a pas besoin d'apprendre l'écriture à la main aux enfants. Vous écrivez au rédacteur en chef pour donner votre avis.", category: "education" },
  { section: "B", topic: "Le mélange entre vie privée et vie professionnelle est inévitable", context: "Votre journal a publié un éditorial affirmant que téléphone, emails et réseaux sociaux rendent le mélange entre vie privée et vie professionnelle inévitable. Vous écrivez à la rédaction pour défendre votre position.", category: "travail" },
  { section: "B", topic: "L'internet met en danger l'avenir du livre", context: "Un récent article affirme que l'internet met en danger l'avenir du livre. Vous écrivez au rédacteur en chef pour défendre ou contester cette affirmation.", category: "culture" },
  { section: "B", topic: "Il faut continuer à investir dans la recherche spatiale", context: "Votre journal affirme que la recherche spatiale aboutira un jour à des découvertes importantes pour l'humanité. Vous écrivez à la rédaction pour défendre l'investissement dans ce domaine.", category: "science" },
  { section: "B", topic: "Le télétravail", context: "Votre journal a ouvert un débat sur le travail à domicile. Vous écrivez au rédacteur en chef pour défendre ou contester le télétravail à l'aide de trois arguments.", category: "travail" },
  { section: "B", topic: "Avec le développement d'Internet, la vie privée n'existe plus", context: "Un article affirme qu'avec le développement d'Internet, la vie privée n'existe plus. Vous écrivez au rédacteur en chef pour défendre votre point de vue.", category: "technologie" },
  { section: "B", topic: "Les jeunes de 25-30 ans habitent chez leurs parents", context: "Votre journal affirme que les jeunes de 25-30 ans habitent chez leurs parents pour des raisons de facilité et de confort. Vous écrivez à la rédaction pour donner votre opinion.", category: "societe" },
  { section: "B", topic: "Les 20 ans sont les meilleures années", context: "Un éditorialiste affirme que les 20 ans sont les meilleures années et qu'on est le plus heureux à cet âge. Vous écrivez au rédacteur en chef pour défendre ou contester cette affirmation.", category: "societe" },
  { section: "B", topic: "Y a-t-il une différence entre les jeunes d'aujourd'hui et la génération précédente ?", context: "Votre journal pose la question de la différence entre les jeunes d'aujourd'hui et la génération précédente. Vous écrivez à la rédaction pour donner votre point de vue.", category: "societe" },
  { section: "B", topic: "Donner de l'argent aux adolescents est une chose mauvaise", context: "Un article récent affirme que donner de l'argent aux adolescents est une chose mauvaise. Vous écrivez au rédacteur en chef pour défendre ou contester cette affirmation.", category: "famille" },
  { section: "B", topic: "Il faut interdire les téléphones portables dans les écoles", context: "Votre journal a publié un éditorial en faveur de l'interdiction des téléphones portables dans les écoles. Vous écrivez à la rédaction pour défendre votre position.", category: "education" },
  { section: "B", topic: "Il faut interdire aux enfants de moins de 10 ans de regarder la télé", context: "Un éditorialiste propose d'interdire aux enfants de moins de 10 ans de regarder la télévision. Vous écrivez au rédacteur en chef pour donner votre avis.", category: "famille" },
  { section: "B", topic: "Les jeux vidéo développent la créativité : on devrait les utiliser à l'école", context: "Votre journal affirme que les jeux vidéo développent la créativité des jeunes et devraient être utilisés à l'école. Vous écrivez à la rédaction pour défendre ou contester cette idée.", category: "education" },
  { section: "B", topic: "Les enfants devraient choisir ce qu'ils veulent étudier à l'école", context: "Un article propose que les enfants choisissent ce qu'ils veulent étudier à l'école. Vous écrivez au rédacteur en chef pour défendre ou contester cette proposition.", category: "education" },
  { section: "B", topic: "Les jeunes non majeurs devraient voter", context: "Votre journal a publié un éditorial en faveur du droit de vote des jeunes non majeurs. Vous écrivez à la rédaction pour donner votre position.", category: "politique" },
  { section: "B", topic: "Bientôt, il sera interdit de fumer dans la rue", context: "Un article annonce que bientôt, il sera interdit de fumer dans la rue. Vous écrivez au rédacteur en chef pour défendre ou contester cette mesure.", category: "sante" },
  { section: "B", topic: "Dans le sportif, c'est l'argent qui est le maître", context: "Votre journal affirme qu'aujourd'hui, dans le domaine sportif, c'est l'argent qui est le maître. Vous écrivez à la rédaction pour défendre votre point de vue.", category: "sport" },
  { section: "B", topic: "Les plus de 65 ans doivent repasser le permis de conduire", context: "Un éditorialiste affirme que les personnes âgées de plus de 65 ans doivent obligatoirement repasser le permis de conduire. Vous écrivez au rédacteur en chef pour défendre ou contester cette mesure.", category: "societe" },
  { section: "B", topic: "La société hyperactive ne peut pas avoir de nouvelle rencontre", context: "Votre journal affirme que la société hyperactive ne permet pas de faire de nouvelles rencontres. Vous écrivez à la rédaction pour donner votre opinion.", category: "societe" },
  { section: "B", topic: "Les ONG sont les mieux placées pour lutter contre la pauvreté", context: "Un article affirme que les ONG sont les mieux placées pour mener la lutte contre la pauvreté. Vous écrivez au rédacteur en chef pour défendre ou contester cette affirmation.", category: "societe" },
  { section: "B", topic: "Les jeux d'argent et de hasard devraient-ils être interdits ?", context: "Votre journal pose la question de l'interdiction des jeux d'argent et de hasard. Vous écrivez à la rédaction pour défendre votre position.", category: "societe" },
  { section: "B", topic: "Les tâches ménagères ne sont pas uniquement pour les femmes", context: "Un éditorialiste affirme que les tâches ménagères sont uniquement pour les femmes. Vous écrivez au rédacteur en chef pour défendre ou contester cette affirmation.", category: "famille" },
  { section: "B", topic: "L'intérêt de la sieste au travail", context: "Votre journal a publié un article sur l'intérêt de la sieste au travail. Vous écrivez à la rédaction pour défendre ou contester cette pratique.", category: "travail" },
  { section: "B", topic: "Vivre heureux avec les personnes qui nous ressemblent", context: "Un article affirme qu'on vit plus heureux avec les personnes qui nous ressemblent (de même niveau, même milieu). Vous écrivez au rédacteur en chef pour défendre ou contester cette idée.", category: "societe" },
  { section: "B", topic: "Le télétravail est réservé aux riches", context: "Votre journal affirme que le télétravail est réservé aux riches. Vous écrivez à la rédaction pour défendre ou contester cette affirmation.", category: "travail" },
  { section: "B", topic: "Le plus important est de réussir sa vie professionnelle", context: "Un éditorialiste affirme que le plus important dans la vie est de réussir sa vie professionnelle. Vous écrivez au rédacteur en chef pour donner votre point de vue.", category: "travail" },
  { section: "B", topic: "Grâce au progrès de la médecine, il n'y aura bientôt plus de maladies", context: "Votre journal affirme que grâce au progrès de la médecine, il n'y aura bientôt plus de maladies. Vous écrivez à la rédaction pour défendre ou contester cette affirmation.", category: "sante" },
  { section: "B", topic: "Les voyages ne sont plus destinés uniquement aux personnes aisées", context: "Un article affirme que les voyages ne sont plus destinés uniquement aux personnes aisées. Vous écrivez au rédacteur en chef pour défendre votre point de vue.", category: "societe" },
  { section: "B", topic: "Le tourisme de masse menace les traditions locales", context: "Votre journal a publié un éditorial affirmant que le tourisme de masse menace les traditions locales. Vous écrivez à la rédaction pour défendre ou contester cette affirmation.", category: "environnement" },
  { section: "B", topic: "Ceux qui voyagent contribuent mieux au développement du monde", context: "Un article affirme que ceux qui voyagent contribuent mieux au développement du monde. Vous écrivez au rédacteur en chef pour donner votre opinion.", category: "societe" },
  { section: "B", topic: "Le voyage en solitaire, c'est plus amusant", context: "Votre journal affirme que le voyage en solitaire est plus amusant. Vous écrivez à la rédaction pour défendre ou contester cette affirmation.", category: "societe" },
  { section: "B", topic: "Apprendre le chinois aux enfants en bas âge", context: "Un éditorialiste propose d'enseigner le chinois aux enfants en bas âge. Vous écrivez au rédacteur en chef pour défendre ou contester cette idée.", category: "education" },
  { section: "B", topic: "La domination de l'anglais menace les langues et cultures", context: "Votre journal affirme que la domination de l'anglais menace de plus en plus les différentes langues et cultures. Vous écrivez à la rédaction pour défendre votre point de vue.", category: "education" },
  { section: "B", topic: "La lecture des romans est une perte de temps", context: "Un article affirme que la lecture des romans est une perte de temps et qu'il vaut mieux lire les journaux. Vous écrivez au rédacteur en chef pour défendre ou contester cette affirmation.", category: "culture" },
  { section: "B", topic: "Pas la peine de lire des livres vu la quantité de films et séries", context: "Votre journal a publié un éditorial affirmant que vu la quantité de films et de séries TV, pas la peine de lire des livres. Vous écrivez à la rédaction pour donner votre position.", category: "culture" },
  { section: "B", topic: "L'histoire ne devrait pas être enseignée à l'école", context: "Un éditorialiste affirme que l'histoire ne devrait pas être enseignée à l'école. Vous écrivez au rédacteur en chef pour défendre ou contester cette idée.", category: "education" },
  { section: "B", topic: "Il faut arrêter d'imposer les romans aux élèves", context: "Votre journal affirme que nous devons arrêter d'imposer aux élèves les romans à l'école. Vous écrivez à la rédaction pour défendre ou contester cette position.", category: "education" },
  { section: "B", topic: "L'art est inutile", context: "Un article récent affirme que l'art est inutile. Vous écrivez au rédacteur en chef pour défendre ou contester cette affirmation à l'aide de trois arguments.", category: "culture" },
  { section: "B", topic: "On ne se fie qu'aux grandes marques quand on fait ses courses", context: "Votre journal affirme qu'on ne se fie qu'aux grandes marques quand on fait ses courses. Vous écrivez à la rédaction pour donner votre opinion.", category: "societe" },
  { section: "B", topic: "Une ville moderne où les magasins ne ferment pas", context: "Un éditorialiste imagine une ville moderne où les magasins ne ferment jamais. Vous écrivez au rédacteur en chef pour défendre ou contester cette vision.", category: "societe" },
  { section: "B", topic: "La publicité influence le comportement de nos achats", context: "Votre journal a publié un article affirmant que la publicité influence le comportement de nos achats. Vous écrivez à la rédaction pour défendre ou contester cette affirmation.", category: "societe" },
  { section: "B", topic: "Il faut changer nos comportements alimentaires pour la planète", context: "Un récent éditorial affirme qu'il faut changer nos comportements alimentaires pour préserver notre planète. Vous écrivez au rédacteur en chef pour défendre votre point de vue.", category: "environnement" },
  { section: "B", topic: "0 % déchets, 0 % gaspillage : il faut encadrer les consommateurs", context: "Votre journal affirme qu'il est moment d'encadrer les consommateurs pour atteindre zéro déchet et zéro gaspillage. Vous écrivez à la rédaction pour défendre ou contester cette mesure.", category: "environnement" },
];

// Grammar topic registry (used for smart missions)
export const GRAMMAR_TOPICS: { key: string; label: string; labelFr: string; description: string }[] = [
  { key: "passe-compose", label: "Passé composé", labelFr: "Passé composé", description: "Formation et accord du passé composé avec avoir et être." },
  { key: "imparfait", label: "Imparfait", labelFr: "Imparfait", description: "Emploi et conjugaison de l'imparfait." },
  { key: "plus-que-parfait", label: "Plus-que-parfait", labelFr: "Plus-que-parfait", description: "Formation et emploi du plus-que-parfait." },
  { key: "passe-simple", label: "Passé simple", labelFr: "Passé simple", description: "Conjugaison du passé simple (usage littéraire)." },
  { key: "conditionnel-present", label: "Conditionnel présent", labelFr: "Conditionnel présent", description: "Formation et emploi du conditionnel présent." },
  { key: "conditionnel-passe", label: "Conditionnel passé", labelFr: "Conditionnel passé", description: "Formation et emploi du conditionnel passé." },
  { key: "subjonctif-present", label: "Subjonctif présent", labelFr: "Subjonctif présent", description: "Emploi et conjugaison du subjonctif présent." },
  { key: "subjonctif-passe", label: "Subjonctif passé", labelFr: "Subjonctif passé", description: "Formation du subjonctif passé." },
  { key: "futur-simple", label: "Futur simple", labelFr: "Futur simple", description: "Formation et emploi du futur simple." },
  { key: "futur-anterieur", label: "Futur antérieur", labelFr: "Futur antérieur", description: "Formation du futur antérieur." },
  { key: "voix-passive", label: "Voix passive", labelFr: "Voix passive", description: "Transformation de la voix active à la voix passive." },
  { key: "discours-indirect", label: "Discours indirect", labelFr: "Discours indirect", description: "Transformation du discours direct au discours indirect." },
  { key: "accord-participe-passe", label: "Accord du participe passé", labelFr: "Accord du participe passé", description: "Règles d'accord du participe passé avec avoir et être." },
  { key: "accord-sujet-verbe", label: "Accord sujet-verbe", labelFr: "Accord sujet-verbe", description: "Accord en nombre et en personne du verbe avec son sujet." },
  { key: "accord-adjectif-nom", label: "Accord adjectif-nom", labelFr: "Accord adjectif-nom", description: "Accord en genre et en nombre de l'adjectif avec le nom." },
  { key: "pronoms-cod-coi", label: "Pronoms COD/COI", labelFr: "Pronoms COD/COI", description: "Emploi des pronoms compléments directs et indirects." },
  { key: "pronoms-relatifs", label: "Pronoms relatifs", labelFr: "Pronoms relatifs", description: "Qui, que, dont, où, lequel — choix du pronom relatif." },
  { key: "pronoms-y-en", label: "Pronoms y et en", labelFr: "Pronoms y et en", description: "Emploi des pronoms adverbiaux y et en." },
  { key: "articles-definis-indefinis", label: "Articles définis/indéfinis", labelFr: "Articles définis/indéfinis", description: "Choix entre article défini, indéfini ou absence d'article." },
  { key: "articles-partitifs", label: "Articles partitifs", labelFr: "Articles partitifs", description: "Emploi du partitif (du, de la, des, de l')." },
  { key: "prepositions", label: "Prépositions", labelFr: "Prépositions", description: "Prépositions de lieu, de temps et abstraites (à, de, en, dans, sur…)." },
  { key: "negation", label: "Négation", labelFr: "Négation", description: "Structures négatives : ne…pas, ne…plus, ne…jamais, ne…rien." },
  { key: "comparatif-superlatif", label: "Comparatif et superlatif", labelFr: "Comparatif et superlatif", description: "Formation du comparatif et du superlatif des adjectifs et adverbes." },
  { key: "connecteurs-logiques", label: "Connecteurs logiques", labelFr: "Connecteurs logiques", description: "Mots de liaison pour structurer le discours et les arguments." },
  { key: "orthographe", label: "Orthographe", labelFr: "Orthographe", description: "Orthographe des mots, accents, homophones et distinctions courantes." },
  { key: "ponctuation", label: "Ponctuation", labelFr: "Ponctuation", description: "Usage correct de la ponctuation (virgule, point-virgule, deux-points…)." },
  { key: "registre-langue", label: "Registre de langue", labelFr: "Registre de langue", description: "Adaptation du ton et du registre (formel, informel, neutre)." },
  { key: "syntaxe", label: "Syntaxe", labelFr: "Syntaxe", description: "Structure et construction des phrases complexes." },
  { key: "gerondif-participe", label: "Gérondif et participe présent", labelFr: "Gérondif et participe présent", description: "Emploi du gérondif (en + participe) et du participe présent." },
  { key: "interrogation", label: "Interrogation", labelFr: "Interrogation", description: "Formes interrogatives (totale, partielle, inversion, est-ce que)." },
];

export function grammarTopicLabel(key: string): { label: string; labelFr: string } {
  const t = GRAMMAR_TOPICS.find((g) => g.key === key);
  return t
    ? { label: t.label, labelFr: t.labelFr }
    : { label: key, labelFr: key };
}

// Maps AI correction tags from level1Errors[].tags to GRAMMAR_TOPICS keys
export const TAG_TO_GRAMMAR_KEY: Record<string, string> = {
  "Passé composé": "passe-compose",
  "Imparfait": "imparfait",
  "Plus-que-parfait": "plus-que-parfait",
  "Passé simple": "passe-simple",
  "Conditionnel présent": "conditionnel-present",
  "Conditionnel passé 1ère forme": "conditionnel-passe",
  "Conditionnel passé 2ème forme": "conditionnel-passe",
  "Subjonctif présent": "subjonctif-present",
  "Subjonctif passé": "subjonctif-passe",
  "Subjonctif plus-que-parfait": "subjonctif-passe",
  "Futur simple": "futur-simple",
  "Futur antérieur": "futur-anterieur",
  "Voix passive": "voix-passive",
  "Discours indirect": "discours-indirect",
  "Discours rapporté": "discours-indirect",
  "Accord participe passé-avoir": "accord-participe-passe",
  "Accord participe passé-être": "accord-participe-passe",
  "Accord du participe passé avec COD antéposé": "accord-participe-passe",
  "Accord sujet-verbe": "accord-sujet-verbe",
  "Accord adjectif-nom (genre)": "accord-adjectif-nom",
  "Accord adjectif-nom (nombre)": "accord-adjectif-nom",
  "Accord determinant-nom": "accord-adjectif-nom",
  "Pronom COD": "pronoms-cod-coi",
  "Pronom COI": "pronoms-cod-coi",
  "Pronom relatif": "pronoms-relatifs",
  "Pronom démonstratif": "pronoms-relatifs",
  "Pronom indéfini": "pronoms-relatifs",
  "Pronom y": "pronoms-y-en",
  "Pronom en": "pronoms-y-en",
  "Article défini": "articles-definis-indefinis",
  "Article indéfini": "articles-definis-indefinis",
  "Article partitif": "articles-partitifs",
  "Contraction à + le (au)": "articles-definis-indefinis",
  "Contraction de + le (du)": "articles-definis-indefinis",
  "Préposition de lieu": "prepositions",
  "Préposition de temps": "prepositions",
  "Préposition abstraite": "prepositions",
  "Négation ne...pas": "negation",
  "Négation ne...plus": "negation",
  "Négation ne...jamais": "negation",
  "Négation ne...rien": "negation",
  "Négation ne...aucun": "negation",
  "Négation ne...ni...ni": "negation",
  "Comparatif": "comparatif-superlatif",
  "Superlatif": "comparatif-superlatif",
  "Connecteurs logiques": "connecteurs-logiques",
  "Registre de langue": "registre-langue",
  "Syntaxe": "syntaxe",
  "Ponctuation": "ponctuation",
  "Orthographe": "orthographe",
  "Gérondif": "gerondif-participe",
  "Participe présent": "gerondif-participe",
  "Interrogation": "interrogation",
};

// ---------------------------------------------------------------------------
// Seed the DB topic bank (idempotent — clears old topics and re-seeds)
// ---------------------------------------------------------------------------
export async function ensureTopicBankSeeded() {
  const count = await db.topicBank.count();
  if (count >= SEED_TOPICS.length) return;
  // Clear and re-seed to ensure official topics replace any old ones
  await db.topicBank.deleteMany();
  await db.topicBank.createMany({
    data: SEED_TOPICS.map((t) => ({
      section: t.section,
      topic: t.topic,
      starterSentence: t.starterSentence ?? null,
      context: t.context ?? null,
      category: t.category,
      isDynamic: false,
    })),
  });
}

// ---------------------------------------------------------------------------
// Pick a random topic from the bank, optionally by section/category
// ---------------------------------------------------------------------------
export async function pickBankTopic(section: "A" | "B", category?: string) {
  const baseWhere: { section: string; category?: string; written?: boolean } = { section };
  if (category) baseWhere.category = category;

  baseWhere.written = false;
  let topics = await db.topicBank.findMany({ where: baseWhere });

  if (topics.length === 0) {
    delete baseWhere.written;
    topics = await db.topicBank.findMany({ where: baseWhere });
    if (topics.length > 0) {
      await db.topicBank.updateMany({
        where: { section },
        data: { written: false },
      });
    }
  }

  if (topics.length === 0) return null;
  return topics[Math.floor(Math.random() * topics.length)];
}

export async function markTopicWritten(section: string, topic: string) {
  const match = await db.topicBank.findFirst({
    where: { section, topic },
  });
  if (match) {
    await db.topicBank.update({
      where: { id: match.id },
      data: { written: true },
    });
  }
}
