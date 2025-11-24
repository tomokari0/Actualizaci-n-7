import { Content } from './types';


export const MOCK_CONTENT: Content[] = [
  {
    id: '1',
    type: 'movie',
    title: 'RH NULO',
    description: 'Su hermana murió cuando tenía 5 años y sus padres nunca lo dejaron salir, hasta que al cumplir los 16 lo dejaron ir a una preparatoria normal por primera vez, ¿Quién diría que eso cambiaría su vida?',
    thumbnailUrl: 'https://ik.imagekit.io/gzrwng096/RH%20Nulo/maxresdefault%20(2).jpg?updatedAt=1751921520460',
    backdropUrl: 'https://ik.imagekit.io/gzrwng096/RH%20Nulo/maxresdefault%20(2).jpg?updatedAt=1751921520460',
    genre: ['Sci-Fi', 'Adventure', 'Drama'],
    rating: 'PG-13',
    releaseYear: 2019,
    featured: true,
    videoUrl: 'https://ik.imagekit.io/gzrwng096/RH%20Nulo/RH%20Nulo.mp4?updatedAt=1751922099564',
    trailerUrl: 'https://www.youtube.com/embed/WSCt0ti_wjs?si=J-REG0IuNy0VL1Fm',
    introStart: 0,
    introEnd: 1,
  },
  {
    id: '2',
    type: 'series',
    title: 'El último segundo',
    description: 'Eric y sus amigos tenían una vida normal hasta que el apocalipsis comenzó. Ahora, Eric, Emily, Dante, Rose, Kevin y Violeta deben sobrevivir en un mundo donde cada segundo cuenta.',
    thumbnailUrl: 'https://ik.imagekit.io/gzrwng096/El%20%C3%BAltimo%20segundo/sddefault%20(7).jpg?updatedAt=1751923615356',
    backdropUrl: 'https://ik.imagekit.io/gzrwng096/El%20%C3%BAltimo%20segundo/sddefault%20(7).jpg?updatedAt=1751923615356',
    genre: ['Action', 'Sci-Fi', 'Thriller'],
    rating: 'R',
    releaseYear: 2020,
    trailerUrl: 'https://youtu.be/ofLMSTKLjVU',
    seasons: [
      {
        id: 's1',
        seasonNumber: 1,
        episodes: [
          {
            id: 's1e1',
            title: 'El Comienzo del Fin',
            description: 'Eric debe cuidar a su hermana pequeña tras el accidente de sus padres, pero el día toma un giro oscuro.',
            thumbnailUrl: 'https://ik.imagekit.io/gzrwng096/El%20%C3%BAltimo%20segundo/sddefault%20(7).jpg?updatedAt=1751923615356',
            videoUrl: 'https://ik.imagekit.io/gzrwng096/Guerra%20de%20amor/Guerra%20de%20____%20_Cap%C3%ADtulo%201_%7BSerie%20original_%7DGacha%20life%20(720p_30fps_H264-128kbit_AAC).mp4?updatedAt=1751918267140',
            duration: '22m',
            introStart: 0,
            introEnd: 64
          },
          {
            id: 's1e2',
            title: 'Supervivientes',
            description: 'El grupo se encuentra por primera vez y decide refugiarse en la escuela.',
            thumbnailUrl: 'https://picsum.photos/seed/s1e2/400/225',
            videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            duration: '24m'
          },
          {
            id: 's1e3',
            title: 'La Decisión',
            description: 'Sin suministros y rodeados, deben tomar una decisión imposible.',
            thumbnailUrl: 'https://picsum.photos/seed/s1e3/400/225',
            videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
            duration: '21m'
          }
        ]
      },
      {
        id: 's2',
        seasonNumber: 2,
        episodes: [
          {
            id: 's2e1',
            title: 'Un Nuevo Mundo',
            description: 'Han pasado dos años. Las reglas han cambiado.',
            thumbnailUrl: 'https://picsum.photos/seed/s2e1/400/225',
            videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
            duration: '25m'
          }
        ]
      }
    ]
  },
  {
    id: '3',
    type: 'movie',
    title: 'Del corazón roto a rompe corazones',
    description: 'Una chica dolida y dispuesta a no confiar más en el amor, logra superar sus miedos gracias a alguien inesperado...',
    thumbnailUrl: 'https://ik.imagekit.io/a2lfezf3h/Del%20coraz%C3%B3n%20roto%20a...%20rompe%20corazones/maxresdefault%20(3).jpg?updatedAt=1751924242363',
    backdropUrl: 'https://ik.imagekit.io/a2lfezf3h/Del%20coraz%C3%B3n%20roto%20a...%20rompe%20corazones/maxresdefault%20(3).jpg?updatedAt=1751924242363',
    genre: ['History', 'Drama', 'Action'],
    rating: 'TV-MA',
    releaseYear: 2020,
    videoUrl: 'https://ik.imagekit.io/a2lfezf3h/Del%20coraz%C3%B3n%20roto%20a...%20rompe%20corazones/Del%20coraz%C3%B3n%20roto%20a...%20rompe%20corazones.mp4?updatedAt=1751924369506',
    trailerUrl: 'https://ik.imagekit.io/a2lfezf3h/Del%20coraz%C3%B3n%20roto%20a...%20rompe%20corazones/Del%20coraz%C3%B3n%20roto%20a...%20rompe%20corazones.mp4?updatedAt=1751924369506',
  },
  {
    id: '4',
    type: 'movie',
    title: '1983',
    description: 'Tanto la música como la trama de la mini pelicula estan inspirados en el Modo 1980 de Yandere Simulator.',
    thumbnailUrl: 'https://ik.imagekit.io/4nltps9rs/1983/sddefault.jpg?updatedAt=1751928743920',
    backdropUrl: 'https://ik.imagekit.io/4nltps9rs/1983/sddefault.jpg?updatedAt=1751928743920',
    genre: ['Horror', 'Mystery', 'Thriller'],
    rating: 'R',
    releaseYear: 2022,
    videoUrl: 'https://ik.imagekit.io/4nltps9rs/1983/_VIEJO__1983_%20Mini%20Pelicula%20de%20Terror_%C2%A6%C2%A6_%20Gacha%20Neon_%C2%A6%C2%A6_Original_%C2%A6%C2%A6__CONTIENE%20SANGRE_%20(480p_30fps_H264-128kbit_AAC).mp4?updatedAt=1751928755930',
    trailerUrl: 'https://ik.imagekit.io/4nltps9rs/1983/_VIEJO__1983_%20Mini%20Pelicula%20de%20Terror_%C2%A6%C2%A6_%20Gacha%20Neon_%C2%A6%C2%A6_Original_%C2%A6%C2%A6__CONTIENE%20SANGRE_%20(480p_30fps_H264-128kbit_AAC).mp4?updatedAt=1751928755930',
  },
  {
    id: '5',
    type: 'movie',
    title: 'Corazón demoniaco',
    description: 'Una chica llamada Naidi es llevada al bosque por un collar sagrado que la elige, y el gigante maldito que debía vigilarla termina enamorándose de ella.',
    thumbnailUrl: 'https://ik.imagekit.io/4nltps9rs/corazon%20demoniaco/sddefault%20(1).jpg?updatedAt=1751928859407',
    backdropUrl: 'https://ik.imagekit.io/4nltps9rs/corazon%20demoniaco/sddefault%20(1).jpg?updatedAt=1751928859407',
    genre: ['Comedy'],
    rating: 'PG-13',
    releaseYear: 2024,
    videoUrl: 'https://ik.imagekit.io/4nltps9rs/corazon%20demoniaco/_Corazon%20demoniaco_mini%20pelicula%20Original%20gacha%20club%20%20%E2%9D%A3%EF%B8%8E%C3%87rist%C3%A5%C5%82is%20%C4%90i%C3%A5m%C3%B8n%C4%91s%E2%9D%A3%EF%B8%8E%20(1080p_30fps_H264-128kbit_AAC).mp4?updatedAt=1751928892173',
    trailerUrl: 'https://ik.imagekit.io/4nltps9rs/corazon%20demoniaco/_Corazon%20demoniaco_mini%20pelicula%20Original%20gacha%20club%20%20%E2%9D%A3%EF%B8%8E%C3%87rist%C3%A5%C5%82is%20%C4%90i%C3%A5m%C3%B8n%C4%91s%E2%9D%A3%EF%B8%8E%20(1080p_30fps_H264-128kbit_AAC).mp4?updatedAt=1751928892173',
  },
  {
    id: '6',
    type: 'movie',
    title: 'Enfermo',
    description: 'este video es una mini pelicula de gacha life en teoria es una versioin retorcida de mi vida je je bueno no importa otra cosa si al principio del video se oye la vos de una mujer es el programa de voz.',
    thumbnailUrl: 'https://ik.imagekit.io/4nltps9rs/enfermo/hqdefault%20(2).jpg?updatedAt=1751929289384',
    backdropUrl: 'https://ik.imagekit.io/4nltps9rs/enfermo/hqdefault%20(2).jpg?updatedAt=1751929289384',
    genre: ['Sci-Fi', 'Horror'],
    rating: 'PG-13',
    releaseYear: 2019,
    videoUrl: 'https://ik.imagekit.io/4nltps9rs/enfermo/enfermo%20mini%20pel%C3%ADcula%20cuddles%20terror%20gacha%20life%20(leer%20descripci%C3%B3n)%20(1080p_30fps_H264-128kbit_AAC).mp4?updatedAt=1751929323701',
    trailerUrl: 'https://ik.imagekit.io/4nltps9rs/enfermo/enfermo%20mini%20pel%C3%ADcula%20cuddles%20terror%20gacha%20life%20(leer%20descripci%C3%B3n)%20(1080p_30fps_H264-128kbit_AAC).mp4?updatedAt=1751929323701',
  },
  {
    id: '7',
    type: 'movie',
    title: 'Amor a primera vista',
    description: 'No description has been added to this video.',
    thumbnailUrl: 'https://ik.imagekit.io/4nltps9rs/Ni%C3%B1ero/maxresdefault%20(1).jpg?updatedAt=1751932881796',
    backdropUrl: 'https://ik.imagekit.io/4nltps9rs/Ni%C3%B1ero/maxresdefault%20(1).jpg?updatedAt=1751932881796',
    genre: ['Drama', 'Romance'],
    rating: 'TV-14',
    releaseYear: 2023,
    videoUrl: 'https://res.cloudinary.com/dfznsof9i/video/upload/v1752007574/Ninero-mini%20pelicula-gacha%20life-yaoi%20sano_leer%20la%20descripcion/Ninero-mini_pelicula_gacha_life_yaoi_sano_leer_la_descripcion_1080p_30fps_H264-128kbit_AAC_gvyyxd.mp4',
    trailerUrl: 'https://res.cloudinary.com/dfznsof9i/video/upload/v1752007574/Ninero-mini%20pelicula-gacha%20life-yaoi%20sano_leer%20la%20descripcion/Ninero-mini_pelicula_gacha_life_yaoi_sano_leer_la_descripcion_1080p_30fps_H264-128kbit_AAC_gvyyxd.mp4',
  },
  {
    id: '8',
    type: 'movie',
    title: 'NUESTRA VERDADERA HISTORIA DE AMOR',
    description: 'En este video especial de la Semana Lyniel les traigo una mini película de Gacha Life animada muy importante para Lyna y Daniel, en la que les cuentan nuestra historia y cómo se conocieron. Si bien está basada en hechos reales, hay algunos detalles que cambian.',
    thumbnailUrl: 'https://ik.imagekit.io/4nltps9rs/NUESTRA%20VERDADERA%20HISTORIA%20DE%20AMOR%20/hqdefault%20(5).jpg?updatedAt=1751932890915',
    backdropUrl: 'https://ik.imagekit.io/4nltps9rs/NUESTRA%20VERDADERA%20HISTORIA%20DE%20AMOR%20/maxresdefault%20(2).jpg?updatedAt=1751932891069',
    genre: ['Action', 'Adventure'],
    rating: 'PG-13',
    releaseYear: 2022,
    videoUrl: 'https://res.cloudinary.com/dfznsof9i/video/upload/v1752007603/NUESTRA_VERDADERA_HISTORIA_DE_AMOR_Mini_Pel%C3%ADcula_Gacha_Life_1080p_50fps_H264-128kbit_AAC_yhpjtw.mp4',
    trailerUrl: 'https://res.cloudinary.com/dfznsof9i/video/upload/v1752007603/NUESTRA_VERDADERA_HISTORIA_DE_AMOR_Mini_Pel%C3%ADcula_Gacha_Life_1080p_50fps_H264-128kbit_AAC_yhpjtw.mp4',
  },
  {
    id: '9',
    type: 'movie',
    title: 'Oxigeno',
    description: `Año 2030. Se declara una emergencia mundial. Todas las plantas dejaron de producir CO2 a causa de la alta contaminación en el ambiente, el fin se parecía acercarse, hasta que unos científicos descubrieron un mineral que poseía las mismas características que el CO2 y que transformada en una sustancia líquida podría ser inyectada en nuestro organismo y nos daba las mismas capacidades para poder vivir. Así fue como esta sustancia fue denominada ''Oxígeno'', un líquido vital para todo ser humano hoy en día en el año 3050. Sin embargo ahora donde nuevamente este recurso escasea y ocurre un gran robo junto a una organización con fines desconocidos, ¿Qué serán de nuestros dos protagonistas cuando les queden pocas opciones de seguir una vida medianamente normal?`,
    thumbnailUrl: 'https://2qhd7azteo.ucarecd.net/e0a88cef-ec2b-42d1-9493-2436c9897975/maxresdefault.jpg',
    backdropUrl: 'https://2qhd7azteo.ucarecd.net/e0a88cef-ec2b-42d1-9493-2436c9897975/maxresdefault.jpg',
    genre: ['Sci-Fi', 'Thriller', 'Mystery'],
    rating: 'R',
    releaseYear: 2021,
    videoUrl: 'https://2qhd7azteo.ucarecd.net/1730bb17-b31f-4308-9a07-f173e6c1d747/OXGENOminipelculaenespaolconvocesGachaClub1080p_30fps_H264128kbit_AAC.mp4',
    trailerUrl: 'https://res.cloudinary.com/dozucdr1j/video/upload/v1763420458/Ox%C3%ADgeno_TR%C3%81ILER_AVANCE_mini_pel%C3%ADcula_con_voces_Gacha_Club_1080p_50fps_H264-128kbit_AAC_kfjief.mp4',
  },
  {
    id: '10',
    type: 'movie',
    title: 'Un peligro inminente',
    description: 'A young historian discovers an ancient artifact that predicts the future. She must protect it from a clandestine organization that wants to weaponize its power.',
    thumbnailUrl: 'https://2qhd7azteo.ucarecd.net/b18468cd-3080-4423-8ae9-7b2485328aed/maxresdefault1.jpg',
    backdropUrl: 'https://2qhd7azteo.ucarecd.net/b18468cd-3080-4423-8ae9-7b2485328aed/maxresdefault1.jpg',
    genre: ['Adventure', 'Fantasy', 'Action'],
    rating: 'PG-13',
    releaseYear: 2021,
    videoUrl: 'https://2qhd7azteo.ucarecd.net/8cf77205-7ec0-4431-b6f1-98c8e98f93bf/UNPELIGROINMINENTEPelculaCompletaGachaClubconvoces1080p_30fps_H264128kbit_AAC.mp4',
    trailerUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEsc5apes.mp4',
  },
  {
    id: '11',
    type: 'movie',
    title: 'Dentro de casa',
    description: 'Trapped by a blizzard in a remote mountain cabin, a group of strangers discovers that a terrifying creature lurks outside, and the greater danger might be within.',
    thumbnailUrl: 'https://2qhd7azteo.ucarecd.net/456210e4-c342-4d5f-aadd-c9857d04f887/sddefault.jpg',
    backdropUrl: 'https://2qhd7azteo.ucarecd.net/456210e4-c342-4d5f-aadd-c9857d04f887/sddefault.jpg',
    genre: ['Horror', 'Thriller'],
    rating: 'R',
    releaseYear: 2024,
    videoUrl: 'https://2qhd7azteo.ucarecd.net/dea1f289-251e-427d-be4f-f6d424910929/DentrodecasaMiniPelculaORIGINALLeerDescripcin1080p_60fps_H264128kbit_AAC.mp4',
    trailerUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBigge3rJoyrides.mp4',
  },
  {
    id: '12',
    type: 'movie',
    title: 'Repite despues de mi',
    description: 'A team of deep-sea explorers stumbles upon the lost city of Atlantis, only to awaken its ancient, monstrous guardians.',
    thumbnailUrl: 'https://2qhd7azteo.ucarecd.net/0a93e6f0-9cca-4ff4-87c3-db4b4d71cb5a/hqdefault.jpg',
    backdropUrl: 'https://2qhd7azteo.ucarecd.net/0a93e6f0-9cca-4ff4-87c3-db4b4d71cb5a/hqdefault.jpg',
    genre: ['Action', 'Adventure', 'Sci-Fi'],
    rating: 'PG-13',
    releaseYear: 2018,
    videoUrl: 'https://2qhd7azteo.ucarecd.net/0cf47aaa-5ec4-42b5-9883-1943bb02fdfd/Repitedespusdemi_MinipelculaConvoces12ORIGINALGachaclubGachalife1080p_30fps_H264128kbit_AAC.mp4',
    trailerUrl: 'https://2qhd7azteo.ucarecd.net/0cf47aaa-5ec4-42b5-9883-1943bb02fdfd/Repitedespusdemi_MinipelculaConvoces12ORIGINALGachaclubGachalife1080p_30fps_H264128kbit_AAC.mp4',
  },
  {
    id: '13',
    type: 'movie',
    title: 'Repite despues de mi 2',
    description: 'A cynical musician finds a vintage vinyl record that allows her to travel back in time, but every trip alters her present in heartbreaking ways.',
    thumbnailUrl: 'https://2qhd7azteo.ucarecd.net/04750149-39f9-4745-aea6-7298748522c4/maxresdefault2.jpg',
    backdropUrl: 'https://2qhd7azteo.ucarecd.net/04750149-39f9-4745-aea6-7298748522c4/maxresdefault2.jpg',
    genre: ['Drama', 'Romance', 'Fantasy'],
    rating: 'PG-13',
    releaseYear: 2022,
    videoUrl: 'https://res.cloudinary.com/dozucdr1j/video/upload/v1763420730/Repite_despu%C3%A9s_de_mi2%EF%B8%8F%E2%83%A3___Mini_pel%C3%ADcula_Original___Con_voces_2_2_LEER_DESCRIPCI%C3%93N_1080p_30fps_H264-128kbit_AAC_ttub4i.mp4',
    trailerUrl: 'https://res.cloudinary.com/dozucdr1j/video/upload/v1763420730/Repite_despu%C3%A9s_de_mi2%EF%B8%8F%E2%83%A3___Mini_pel%C3%ADcula_Original___Con_voces_2_2_LEER_DESCRIPCI%C3%93N_1080p_30fps_H264-128kbit_AAC_ttub4i.mp4',
  },
  {
    id: '14',
    type: 'movie',
    title: 'mi bully es el padre de mi hijo',
    description: 'In 1920s New York, a young woman from a poor neighborhood gets entangled in the dangerous and deceptive world of the city\'s high society.',
    thumbnailUrl: 'https://2qhd7azteo.ucarecd.net/622ff849-7dda-4722-b6cf-fba2fb0a78a9/maxresdefault3.jpg',
    backdropUrl: 'https://2qhd7azteo.ucarecd.net/622ff849-7dda-4722-b6cf-fba2fb0a78a9/maxresdefault3.jpg',
    genre: ['Drama', 'History', 'Romance'],
    rating: 'TV-14',
    releaseYear: 2020,
    videoUrl: 'https://2qhd7azteo.ucarecd.net/bda68e6e-5334-4c1f-a539-787eb0f33b5b/MIBULLYESELPADREDEMIHIJOGachalifeminipelculaGLMM1440p_30fps_AV1128kbit_AAC.mp4',
    trailerUrl: 'https://2qhd7azteo.ucarecd.net/bda68e6e-5334-4c1f-a539-787eb0f33b5b/MIBULLYESELPADREDEMIHIJOGachalifeminipelculaGLMM1440p_30fps_AV1128kbit_AAC.mp4',
  },
  {
    id: '15',
    type: 'movie',
    title: 'En proceso',
    description: 'The first zero-gravity sports tournament is sabotaged. An underdog team of misfits must uncover the conspiracy before the final match.',
    thumbnailUrl: 'https://picsum.photos/seed/zero1/400/6600',
    backdropUrl: 'https://picsum.photos/seed/zero2/1920/108530',
    genre: ['Comedy', 'Sci-Fi', 'Action'],
    rating: 'PG',
    releaseYear: 2025,
    videoUrl: 'http://commondatastor76age.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    trailerUrl: 'http://commondatast56orage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  },
  {
    id: '16',
    type: 'series',
    title: 'El mundo alocado de Lucy',
    description: 'Mundo loco de Lucy 797',
    thumbnailUrl: 'https://2qhd7azteo.ucarecd.net/83a8b8fe-190c-4018-b35c-3c830c7aefe7/LamudanzaelcomienzodeunanuevaaventuraCaptulo1Lucy797BQ.jpg',
    backdropUrl: 'https://2qhd7azteo.ucarecd.net/83a8b8fe-190c-4018-b35c-3c830c7aefe7/LamudanzaelcomienzodeunanuevaaventuraCaptulo1Lucy797BQ.jpg',
    genre: ['Sci-Fi', 'Fantasy', 'Adventure'],
    rating: 'TV-14',
    releaseYear: 2025,
    seasons: [
      {
        id: 's1',
        seasonNumber: 1,
        episodes: [
          {
            id: 's1e1',
            title: ' La mudanza, el comienzo de una nueva aventura',
            description: 'Holaa hermosos y hermosas 💗 hoy vengo con el primer capítulo de la serie espero les guste mucho, aprovecho para decir que apartir de ahora comenzaré a saludar en los próximos videos✨🌺',
            thumbnailUrl: 'https://2qhd7azteo.ucarecd.net/83a8b8fe-190c-4018-b35c-3c830c7aefe7/LamudanzaelcomienzodeunanuevaaventuraCaptulo1Lucy797BQ.jpg',
            videoUrl: 'https://2qhd7azteo.ucarecd.net/99fe03c8-48b4-47ab-9e11-20b959fb4377/LamudanzaelcomienzodeunanuevaaventuraCaptulo1Lucy7971440p_30fps_VP9128kbit_AAC.mkv',
            duration: '5m',
            introStart: 0,
            introEnd: 97
          },
          {
            id: 's1e2',
            title: '24 horas convertida en flewin',
            description: 'Hola chicos :D Por favor mil disculpas por no subir el cap🙏😖 Es que tuve muchos inconvenientes y hoy mismo fué que lo pude terminar🥺💔 Espero me entiendan :3',
            thumbnailUrl: 'https://2qhd7azteo.ucarecd.net/91d6a715-ae9e-4bc2-b68c-2d11a808c1c3/24horasconvertidaenflewinCaptulo2Lucy797BQ.jpg',
            videoUrl: 'https://2qhd7azteo.ucarecd.net/a1dc6113-5be3-4638-939c-f2f4a77f7e30/24horasconvertidaenflewinCaptulo2Lucy7971440p_30fps_VP9128kbit_AAC.mkv',
            duration: '7m',
            introStart: 0,
            introEnd: 97
          },
          {
            id: 's1e3',
            title: 'Nuestro 1er día de clases + nuevos compañeros',
            description: 'Hoy vengo con el capítulo 3 de la serie 🙈💞 Disfrútenlo mucho :D',
            thumbnailUrl: 'https://2qhd7azteo.ucarecd.net/45e751a7-04a3-4730-bfe2-fdbfe31c66ee/Nuestro1erdadeclasesnuevoscompaerosCaptulo3Lucy797BQ.jpg',
            videoUrl: 'https://2qhd7azteo.ucarecd.net/33a14e71-54fc-498e-83a8-6eed4ae998eb/Nuestro1erdadeclasesnuevoscompaerosCaptulo3Lucy7971440p_30fps_VP9128kbit_AAC.mkv',
            duration: '8m'
          },
          {
            id: 's1e4',
            title: 'Descubro que tengo un hermano',
            description: 'ADVERTENCIA: A partir de ahora yo seré la voz de Jack (Aún no sé si temporal o definitivo), debido a que la persona que hacía su voz se encontraba inactivo, tuve que hacer la voz lo más parecido posible',
            thumbnailUrl: 'https://2qhd7azteo.ucarecd.net/4a25f82e-2595-457b-960b-2529730f8a8f/DescubroquetengounhermanoCaptulo4Colaboracinconxtoxin4343Lucy797BQ.jpg',
            videoUrl: 'https://2qhd7azteo.ucarecd.net/f8ec456e-d117-46d8-82d8-ae9a2c887d74/DescubroquetengounhermanoCaptulo4Colaboracinconxtoxin4343Lucy7971440p_30fps_VP9128kbit_AAC.mkv',
            duration: '8m'
          },
          {
            id: 's1e5',
            title: 'Encerrados en el baño de profesores',
            description: `Hoy les traigo el capítulo 5 de la serie. Recuerden que habrá una nueva intro, aunque pido mil disculpas si les gustaba más la anterior 🥺. Pero aún así espero lo disfruten 💞.`,
            thumbnailUrl: 'https://2qhd7azteo.ucarecd.net/36e0d801-ce9e-464c-94d7-225f0e78e760/EncerradosenelbaodeprofesoresNuevaintroLucy797BQ.jpg',
            videoUrl: 'https://2qhd7azteo.ucarecd.net/10743af3-679e-48b1-9cfd-a8fe5b70cb99/EncerradosenelbaodeprofesoresNuevaintroLucy7971440p_30fps_VP9128kbit_AACespaol.mkv',
            duration: '11m'
          },
          {
            id: 's1e6',
            title: 'Una navidad inolvidable',
            description: `Hola chicos, este es el especial navideño 🎄💐 Espero que lo disfrurten mucho :3
Hubo un fragmento que tuve que elminar porque mi cel no tenía espacio, pero lo subiré después 😊💕`,
            thumbnailUrl: 'https://2qhd7azteo.ucarecd.net/247d9b57-d272-443c-9d54-109cfb040270/UnanavidadinolvidableEspecialnavideoConundadeatrasovHikalucyLucy797BQ.jpg',
            videoUrl: 'https://2qhd7azteo.ucarecd.net/65fefd4b-9b3e-4628-8d23-01e4684bf46e/UnanavidadinolvidableEspecialnavideoConundadeatrasovHikalucyLucy797720p_30fps_H264128kbit_AAC.mp4',
            duration: '13m'
          },
          {
            id: 's1e7',
            title: '¡Preguntas y Retos!',
            description: 'Solo preguntas y retos.',
            thumbnailUrl: 'https://2qhd7azteo.ucarecd.net/7955d340-b78a-4867-b1a5-3360c5f1f4b6/PreguntasyRetosConlacreadoravLucy797BQ.jpg',
            videoUrl: 'https://2qhd7azteo.ucarecd.net/8d6355bd-bd75-48ec-8366-0f8a2f5f803a/PreguntasyRetosConlacreadoravLucy7971440p_30fps_VP9128kbit_AAC.mkv',
            duration: '10m'
          },
          {
            id: 's1e8',
            title: 'Visitamos a Alex + poniendo celoso a Hikari',
            description: 'Aquí les traigo el cap de la serie, enserio lo siento por haberme tardado muchísimo 😿, últimamente tuve falta de motivación y ya saben, la escuela jsjs ^^ 😅.',
            thumbnailUrl: 'https://2qhd7azteo.ucarecd.net/7c650308-3a84-4d77-a093-b0848d3ba96b/VisitamosaAlexponiendocelosoaHikariCaptulo8Lucy797BQ.jpg',
            videoUrl: 'https://2qhd7azteo.ucarecd.net/bf287f8a-c5eb-48e0-91b2-82f76088db3a/VisitamosaAlexponiendocelosoaHikariCaptulo8Lucy7971440p_30fps_VP9128kbit_AAC.mkv',
            duration: '11m'
          },
          {
            id: 's1e9',
            title: 'Jack confiesa que le gusta Anita ¿Sale mal?',
            description: `Espero que les haya gustado, tmb hay nuevas voces para algunos personajes 😽, nuevamente pido disculpas por tardarme como 2 meses en subirlo jsjs, pero weno, pido perdón tmb si hubieron algunos errores de edición :')`,
            thumbnailUrl: 'https://2qhd7azteo.ucarecd.net/c3336c12-3363-462f-8ba7-10cd41c13be7/JackconfiesaquelegustaAnitaSalemalNuevosvillanosymsCaptulo9CONVOCESHQ.jpg',
            videoUrl: 'https://2qhd7azteo.ucarecd.net/234e2bad-d424-4a98-ab4f-0d922b201b43/JackconfiesaquelegustaAnitaSalemalNuevosvillanosymsCaptulo9CONVOCES1440p_30fps_VP9128kbit_AAC.mkv',
            duration: '19m'
          },
          {
            id: 's1e10',
            title: 'Si yo estuviera en una escuela de chicos',
            description: `Espero les guste florecitas y capullitos 🥰. Felices fiestas a ustedes, pásenla lindo 💓.
Lamento haberme tardado en subirlo nuevamente, esta vez tuve problemas con el micrófono, por eso escucharán algunos audios de Lucy un poco saturados o algo así :').`,
            thumbnailUrl: 'https://2qhd7azteo.ucarecd.net/81296ab3-b3df-4eeb-bac4-d0031f24aa3f/SiyoestuvieraenunaescueladechicosConvocesCaptulo10Lucy797BQ.jpg',
            videoUrl: 'https://2qhd7azteo.ucarecd.net/6de6bf38-f05d-478c-8bf7-871443ed97e4/SiyoestuvieraenunaescueladechicosConvocesCaptulo10Lucy7971440p_30fps_VP9128kbit_AAC.mkv',
            duration: '12m'
          },
          {
            id: 's1e11',
            title: 'La ex de Alfredo',
            description: `Espero les guste, lo siento la tardanza de casi 7 meses, pero como dicen, más vale tarde que nunca, igualmente me disculpo x los errores que podrían haber ya sea de edición o diálogo :').`,
            thumbnailUrl: 'https://2qhd7azteo.ucarecd.net/94e2cc05-196c-4ccd-bade-61b7fa80f998/LaexdeAlfredoNuevospersonajesLucy797LaserieCaptulo11BQ.jpg',
            videoUrl: 'https://2qhd7azteo.ucarecd.net/42653f68-f000-427a-9d28-de9558dc2b2d/LaexdeAlfredoNuevospersonajesLucy797LaserieCaptulo111080p_30fps_H264128kbit_AAC.mp4',
            duration: '23m'
          }
        ]
      }
    ]
  }
];

