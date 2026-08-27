// Auto-generated pure TypeScript default data definitions for Vercel Serverless runtime compatibility
// Avoids ERR_IMPORT_ATTRIBUTE_MISSING on Node ESM

export const defaultPeriods: any = [
  {
    "id": "072026",
    "label": "07/2026"
  },
  {
    "id": "062026",
    "label": "06/2026"
  },
  {
    "id": "052026",
    "label": "05/2026"
  },
  {
    "id": "042026",
    "label": "04/2026"
  },
  {
    "id": "032026",
    "label": "03/2026"
  },
  {
    "id": "082026",
    "label": "08/2026"
  }
];

export const defaultAtividades072026: any = [
  {
    "id": "task-072026-t6zra",
    "name": "MEVO - Envio do titulo profissional",
    "jiraOrMovidesk": "https://doc24.atlassian.net/browse/DOC24-1980",
    "priority": "P0",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Finalizada",
    "category": "Funcional",
    "startDate": "19/5/2026",
    "endDate": "19/5/2026",
    "description": "Enviar o titulo CRN,CRP,CRMV, etc",
    "notes": "Feito deploy em 16/07 e Antonio já retornou a Marcia para que fosse feito o teste devid a uma nova implantação.",
    "componente": "Back-End"
  },
  {
    "id": "task-072026-nln87",
    "name": "InterAll - Instabilidade no serviço",
    "jiraOrMovidesk": "28425",
    "priority": "P0",
    "owner": "Caio Augusto dos Santos",
    "status": "Finalizada",
    "category": "Suporte a integração",
    "startDate": "2025-08-05",
    "endDate": "2026-03-07",
    "description": "",
    "notes": "Aguardamos reunião com a INterall, previsata para a próxima terça - 02/06. - 08/06 - Aguarda analise da interall. Após a reativação, identificamos novamente erros de servidor na InterAll. - 12/06 - Segunda 15/06 será ativado a integração. 15/06 Novamente reportado erro durante a integração, porém prontamente a integração foi desativada. Caio fará o monitoramento expontaneo mas o tema será considerado finalizado.",
    "componente": "Back-End"
  },
  {
    "id": "task-072026-53mzs",
    "name": "UGF - exclusão de profissionais doc24 - Guardia",
    "jiraOrMovidesk": "47683",
    "priority": "P0",
    "owner": "Matheus Americo Souza Silva",
    "status": "Finalizada",
    "category": "Suporte L2",
    "startDate": "2026-04-29",
    "endDate": "2026-07-22",
    "description": "Exclusão de profissionais com CRM igual a profissionais Unimed",
    "notes": "08/05/2026 - Ticket para exclusão de profissionais no fluxo de plantão guardia aberto e aguardando refinamento. | 14/05/2026 - Ticket refinado nesta data. No momento aguarda priorização. | 27/05/2026 - Tema em desenvolvimento com Juli Costa, aguardando subida em test para nós testarmos, foi desenvolvido que em admin não lista os medicos para a brnad que tenha profissionais em profesionales_brands_habilitados e que o profissional só possa atender a pacientes com o parametro guardia_activo = 1. | 23/06/2026 - Após liberação do desenvolvimento para testes realizamos a primeira bateria de testes para verificar  que foi desenvolvido, vimos que o parametro guardia activo controla se os pacientes aparecem para o medico porém após um paciente voltar para sala de espera é possivel que o medico proceda com o atenidmento do paciente mesmo o parametro desativado. Realizamos essa anotação e encaminhamos para o desenvolvedor. | 02/07/2026 - Nesta data realizamos novos testes após correção do desenvolvimento pelo desenvolvedor, foi aplicado o mesmo cenario retornando o paciente para sala de espera e vimos que foi corrigido. Foi feito um comentario no ticekt e direcionado para testes de QA. | 16/07 - Feito deploy | 17/07 - Validado com Nacho a necessidade de exclusão de profissionais de guardia. Aguardo retorno do time operacional.",
    "componente": "Back-End"
  },
  {
    "id": "task-072026-1r8y2",
    "name": "TISS - IBCM",
    "jiraOrMovidesk": "https://doc24.atlassian.net/browse/DOC24-1545",
    "priority": "P0",
    "owner": "Matheus Americo Souza Silva",
    "status": "Ag. Deploy",
    "category": "Suporte a integração",
    "startDate": "30/3/2026",
    "endDate": "",
    "description": "Acompanhar Math Santos na Ativação do TISS para IBCM",
    "notes": "30/03 - Math Santos solicitouo insert na plataforma_brands_external_api. Math Americo irá realizar o insert até 30/03. | 30/03/2026 Math Americo atualizou os dados e devolveu a Math Santos. | 06/04/26 - Reunião com a IBCM nesta data, foi confirmado da perte deles que o endpoint receber o CPF portando iriam realizar a criação do afiliado na doc24 com o tipo de identificação CPF. | 07/04/26 - Enviar a formalização da reuniçao realizada em 06/04; mais solicitação dos endpoints corretos para integração TISS. | 08/04/26 - Formalização da necessidade de termos os endpoints na arquitetura correta de SOAP /TISS. | 13/04/2026 - Endpoint ainda não esta acessível, Math Américo irá validar junto ao Math Santos se temos atualizações sobre o tema. | 13/04/2026 - Sergio (IBCM) - Compartilhou novos endpoints no formato wsdl; Math Santos irá realizar testes e Math Américo acompamnhará para validar os logs. Ainda estão validando se os endpoints recebem CPF ou Carteirinha. | 15/04/2026 - Math Santos confirmou através de testes que os endpoints não estão recebendo o CPF do afiliado, sendo assim o cliente solicitou que sigamos com o orçamento de uma customização. | Será criado um controlador que passará a ler um novo parametro na tabela external_api. O cliente criará os afiliados com CPF como valor de identificação e enviará a carteirinha como credencial e esse controlador deverá ler a credencial para integrar com a TISS. | - Ticket aberto e pronto para ser refinado com o time de desenvolvimento. | 20/04 - Math irá formalizar o presuposto. | 27/04/2026 - Realizado formalização da aprovação do cliente através do Ticket. | 29/04/2026 - Ticket na fila para desenvolvimento. 21/05 - Math Americo e Math Santos iniciaram os testes da integração TISS. | 22/05/2026 - Antonio apontou via email que os endpoints apesarem de estarem com wsdl no final estão com problemas ao tentar importa-los via SoapUI. | 03/06/2026 - Após o cliente retornar alegando correção de 1 dos problemas apontados, Math Américo fez testes e identifiou que os problemas ainda persistem e foi silaziado. | 15/06/2026 - Os endpoints estão indisponiveis. | 06/07/2026 - Time da IBCM / TOTVS retornaram sinalizando uma nova versão estava disponibilizada com os endpoints corrigidos, nesta mesma data aplicamos diversos testes e identificamos que os wsdl estavam acessiveis porém o arquivo .xsd não era localizado, estava com problemas de imortação, retornamos para correção do cliente e enviamos um payload da nossa requisição para que eles possam testar do seu lado também. | 07/07/2026 - O erro permanece | 10/07/2026 -  Realizando teste hoje o erro de importação do wsdl foi corrigido porém ao tentar realizar testes via aplicação ou soapui temos um retorno de glosa 9902 e mensagem: 'TRANSACAO NAO SUPORTADA   TISSVERIFICAELEGIBILIDADEV4 03 00VCABECA WSDL' - Possivelmente indica que o Protheus espera receber uma versão diferente da V4 03; talvez a versão antiga. Isso foi reportado por email para que possam analisar. | 13/07/2026 - Agenda interna do cliente, solicitado apoio doc24 para demonstração do XML que esta integrado na plataforma.\n22/07 - Feita reunião com cliente, validando o ultimo desenvolvimento que o dev realizou. Sendo possível acessar o serviço com o CPF, e validando a TISS. Desenvolvimento corrigiu limitação de retorno do servidor da TOTVS. 24/07 - Matheus realizou os testes e Lucio aprovou a migração para prod.",
    "componente": "Back-End"
  },
  {
    "id": "task-072026-pf132",
    "name": "UA - Ativar integração",
    "jiraOrMovidesk": "https://doc24.movidesk.com/Ticket/Edit/48018",
    "priority": "P0",
    "owner": "Matheus Americo Souza Silva",
    "status": "Constante",
    "category": "Suporte a integração",
    "startDate": "22/4/2026",
    "endDate": "",
    "description": "Suporte técnico de integração entre doc24 e UA",
    "notes": "Aguardando devolutiva do cliente sobre o erro de dns apresentado. 05/05 Antonio disponíbilizou a UA exemplos de mensagens do webhook, e fará a ativação do mesmo em testes. - | 06/05 UA retornou com dúvidas em status do webhook, e Antonio fará a devolutiva. | 08/06 - Antonio falará com o Alexandre sobre a criação da plataforma - | 03/07 reunião com cliente + criação da plafaforma em espanhol + credenciais de integração. Feito teste de acesso a sala de espera direcionado a profissionais com idioma ES, necessario validação do cliente das notificações + parametrizar em prod. | 13/07/2023 - Solicitamos a criação das credenciais de integração de produção; Aguardadno cliente testar o fluxo completo. 24/07 - Antonio e Matheus farão uma nova agenda com o Cliente",
    "componente": "Back-End"
  },
  {
    "id": "task-072026-yevf9",
    "name": "Estatuto do paciente - Ativar nome de acompanhantes",
    "jiraOrMovidesk": "46341",
    "priority": "P1",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Finalizada",
    "category": "Funcional",
    "startDate": "25/5/2026",
    "endDate": "10/6/2026",
    "description": "Ativar o campo custom para armazenamento do nome do acompanhante, segundo o novo estatuto do paciente",
    "notes": "Neste momento já foi levantada a relação de brands com o uso dos campos custombrand;be_parameter | 210;custom_1 | 493;custom_1.      Antonio estará mapeando todas as tabelas necessárias para criação em massa. Após cadastro em massa, os parametros serão ativos . Lista de inserts prontos, que serão executados na segunda. 08/06 - Caio aguarda a lista de brands corrigida 10/06 - Compartilhada pela marcinha a lista atualizada e ja aplicado em produção. Validado que todos os campos foram adicionados de forma correta inclusive aos brands 210 e 493. Devido a falta de atualizações, este tema foi encerrado por Antonio",
    "componente": "Front-End"
  },
  {
    "id": "task-072026-i3qfh",
    "name": "Unimed Teresina - Novos endpoint de integração TISS",
    "jiraOrMovidesk": "33771",
    "priority": "P1",
    "owner": "Caio Augusto dos Santos",
    "status": "Finalizada",
    "category": "Suporte a integração",
    "startDate": "20/5/2026",
    "endDate": "",
    "description": "UNIMED teresina mudou o fornecedor da infraestrutura TISS, e passamos a ter dificuldade de integrar com a mesma",
    "notes": "Foi estabelecido um plano de contingência, relacionado a prestação de serviços da doc24 aos pacientes da UNIMED Teresina. Será utilizada a elegibilidade padrçao (afiliados) da doc24, tendo a carga periódica das vidas. O time de operações recebeu o treinamento para crir e faturar manualmente as guias, até que a integração seja solucionada por parte do cliente. Testar a carga de vidas via arquivo e garantir que Geoavane tenha o layout e dados adequados. A carga de vidas será carregada  no dia de hoje. Base carregada hoje 16/03 funcionou normalmente por BD e por Excel. 18/03 foi compartilhado com  doc24 um endpoint de elegibilidade de prd, e do24 solicitou o de testes. 06/04/2026 Geovani Schwaltz cobrou devolutiva. 10/04 - Antonio recebeu outro endpoint na v401, onde aplicará testes integrados a fim de identificar a origem do problema. Antonio realizou testes durante as semanas, e via aplicação esta conflitando com o novo desenvolvimento de elegibilidade para Teresina. 24/04 - Diego foi orientado sobre o problema e estará corrigindo assim que possível. 05/05 - Diego retomou o desenvolvimento, após tirar dúvidas com Juli. 06/05/2026 - Dieogo fez o alinhamento junto ao Juli, e a nova versão do pojeto será disponibilizada em testes na próxima sexta-feira. Caio solicitará a Teresina o cadastro de profissionais teste, assim como a aprovação das guias de exemplo. Caio irá derivar com Giovani para o cadastro e teste dos demais endpoints tiss.. Bloqueado devido a pendencias de cadastros dentro da Teresina. Devido a falta de atualizações, este tema foi encerrado por Antonio",
    "componente": "Back-End"
  },
  {
    "id": "task-072026-nesgt",
    "name": "Localização do paciente - PA Saúde mental",
    "jiraOrMovidesk": "https://doc24.movidesk.com/Ticket/Edit/44121  https://doc24.atlassian.net/browse/DOC24-2113",
    "priority": "P0",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Ag. Deploy",
    "category": "Funcional",
    "startDate": "20/7/2026",
    "endDate": "",
    "description": "Disponíbilizar ao profissional acesso a geolocalização do paciente durante a consulta",
    "notes": "Uma contingência foi configirada em testes, utilizando o campo custom, porém a solução definitiva precisará ser desenvolvida. Ticket foi aberto e aguarda refinamento. 27/07 - Antonio realizou os testes e verificou que as informações do contato de emergencia e localização do paciente estão sendo exibidas na página de contato do paciente, durante a consulta",
    "componente": "Front-End"
  },
  {
    "id": "task-072026-71fb4",
    "name": "MIMO",
    "jiraOrMovidesk": "-",
    "priority": "P0",
    "owner": "Matheus Americo Souza Silva",
    "status": "Pendente",
    "category": "Suporte a integração",
    "startDate": "2026-07-17",
    "endDate": "",
    "description": "",
    "notes": "Antonio e Math irão analisar e corrigir a autenticação do token no Webhook. Cliente irá realizar modificações em seu serviço para permitir autenticar por Autorization/Bearer Token\n31/07 - Desativar todas as comunicações entre doc24 e paciente, menos a de receitas/historial",
    "componente": "Back-End"
  },
  {
    "id": "task-072026-3azn3",
    "name": "Programa da Cupos / Qualy e Esaude",
    "jiraOrMovidesk": "https://doc24.atlassian.net/browse/DOC24-2186",
    "priority": "P1",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Ag. Priorização",
    "category": "Suporte L2",
    "startDate": "20/4/2026",
    "endDate": "",
    "description": "Pacientes tem a possibilidade de fazer consultas a mais do que o limite de cupos",
    "notes": "Não foram identificadas alterações nos planos, porém foi identificada uma atualização da elegibilidade, sem mudanças de dados. Caio irá tentar replicar os cenários e soimular o erro (Permitir mais consultas que configuradas nos cupos). 23/04 feito testes idenficiando diferenças no metodo aplicado em teste e prod. Ticket encaminhado a Matheus americo para desenvolvimento de correção de bug. 27/04/2026 - Caio irá revisar as configurações de cupos. | 29/04/2026 - Compartilhar para fila do Math. Tema seguirá para desenvolvimento | Pendecia de revisão do ticket no jira antes de liberar para desenvolvimento. | 14/05/2026 - Tema foi derivado para testes de QA para que seja identificado se realmente há problemas de cupos e se será necessário desenvolvimento para correção do tema. Ticket foi impedido devido a testes realizados pela equipe de QA. O controlador apresentou pleno funcionamento. - 08/07 - Reunião realizada com time de QA e Aldana ficou responsavel de fazer novos testes e retornar a Matheus quando encontre o erro. Já que durante a reunião não foi identificada erro de configuração. Se necessario, vamos fazer a correção do ticket para desenvolvimento de validação para turnos confirmados e não consumidos | 08/07 - Após ajuste do damian, é possivel acessar o APK por documento CPF, foi compartilhado com o Tiago a nova versão, aguardando retorno dele para seguimento. | 13/07 - Aldana adiciona comentario ao ticket do JIRA, solicitando desenvolvimento de controlador de agendamentos, após identificar o erro que reportamos, validando nossos testes. | 14/07/2026 - Vicky fez um comentário no ticket nesta data, deverá ser realizado novos testes com os parametros: autogestion_paciente_forzar_padron = 1 e habilitar_pago_fallo_padron = 0. Criar o plano 'testecupos' e validar novamente o comportamento.\n28/07 - Vic realizará uma nova bateria de analises e testes",
    "componente": "Back-End"
  },
  {
    "id": "task-072026-ewomg",
    "name": "UGF - Doctor-U - Atendimento de intercambio + UGF - Testes da APK - Consultas eletivas",
    "jiraOrMovidesk": "https://doc24.movidesk.com/Ticket/Edit/35928",
    "priority": "P1",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Em QA",
    "category": "Funcional",
    "startDate": "4/3/2026",
    "endDate": "",
    "description": "Abrir tickets de desenvolvimento para possibilitar que  pacientes de outras unimeds sejam atendidos pela Cabine + Agendamento de consultas via APK Cabine UGF",
    "notes": "Deverá revisar os tickets já abertos, e alinhar com o escopo do projeto. Aguarda a documentação do search_beneficiario, e definição de comportamento do endpoint. | 07/04 - Pendente fazer teste da cabine. | 13/04/2026 - Math Américo irá atualizar os tickets do JIRA para o próximo refinamento. | 13/04/2026 - Realizamos uma comunicação com o Tiago conforme acordado dia 10/04 nós propomos uma alteração no requisito para que não haja necessidade de criação de botão para segregar beneficiarios. | 14/04/2026 - Ajustar os tickets. | 15/04/2026 - Tickets ajustados e prontos para refinamento. | 29/04/2026 - Ticket segue aguardando desenvolvimento. + Teste realizados com alguns impeditivos. Solicitado novas carteirinhas em 06/03, aguardando cliente. | 10/03/2026 - Antonio compartilhou os prints atuais para o time de QA + Dev revisarem os erros já localizados. | 02/04/2026 - Math ajudará assumindo e retestando a UX do app. 13/04 - Math esta escrevendo o ticket com as melhorias para refinamento | 15/04/2026 - Ticket aberto e pronto para refinamento com os pontos de usuabilidade que foram identificados nos testes dacabine. | 29/04/2026 - Ticket segue aguardando desenvolvimento. | 14/05/2026 - Ticket refinado nesta data, No momento aguarda priorização e inicio da desenvolvimento. | 10/07/2026 - Realizamos os testes da apk doctor-u após correção do app pelo Juli porém observamos que no momento não corre mais looping infinito, todavia a apk parece não entender o retorno que recebe de backend em relação ao tratamento no caso de um cliente intercambio... todos os testes aparecem tela de erro. 21/07 - Math aguarda resposta do Tiago sobre o primiero atendimento de pacientes intercambio",
    "componente": "Mobile"
  },
  {
    "id": "task-072026-5q3gm",
    "name": "Doutor Aqui - Configurações de profissionais",
    "jiraOrMovidesk": "50549",
    "priority": "P1",
    "owner": "Caio Augusto dos Santos",
    "status": "Finalizada",
    "category": "Suporte L2",
    "startDate": "9/6/2026",
    "endDate": "1/7/2026",
    "description": "Habiliar campos na aba medicos",
    "notes": "Cliente solicita após apresentação do time operacional, inclusão de campos como microfone de tradução para campos de preenchimento do prontuario, inclusão de alergias, medicações atuais, parametros basicos e retirada de outros campos, além da inclusão e exclusão de informações da aba de interconsulta entre profissionais. Marcia retornou o ticket com as solicitações de modificação dos parametros. 01/07/26 - Ticket direcionado para marcia configurar via Tela ADMIN do cliente parametros que deveriam deixar de aparecer.",
    "componente": "Back-End"
  },
  {
    "id": "task-072026-31cn8",
    "name": "UGF - Cadastro de profissionais DOC24 X UGF",
    "jiraOrMovidesk": "https://doc24.movidesk.com/Ticket/Edit/45712",
    "priority": "P1",
    "owner": "Matheus Americo Souza Silva",
    "status": "Ag. Desenvolvimento",
    "category": "Funcional",
    "startDate": "27/4/2026",
    "endDate": "28/4/2026",
    "description": "É reportado pelo cliente que há um problema na qual impacta diretamente o atenidmento de plantão na geração de guias. Ocorre que há um prazo de 5 dias para que o profissional seja cadastrado no sistema SGU da Unimed, esse prazo ocorre logo após o profisisonal ser cadastrado na doc24; | Há casos em que o profissional inicia o atendimento imediatamente após seu cadastro na doc24 e como ainda não há cadastro na unimed ocorre um bloqueio na geração de guia e autorização.",
    "notes": "27/04/2026 - Math estará analisando o processo atual, para avaliar se temos oportunidade de melhoria. | 05/05 - Math criou os tickets de BE, FE, UX. Pendente apenas o ticket de BE para o complemento do CRM. | Aberto ticekt para correção do problema de CRM - Estamos propondo a alteração de comportamento através do controle de parametro que deverá enviar um código de prefixo antes do CRM do médico no momento de envio do XML. Não deverá ser alterado nenhum cadastro do profissional, apenas o envio do XML. | 14/05/2026 - Foi levado em refinamento esse tema para automatização do cadastrado de profissionais e o tema deverá ser discutido apartado, todavia não foi refinado. Há uma demanda antiga na qual se solicitou algo semelhante, deverá er analisado para avaliarmos se há possibilidade de reutilizarmos essa demanda.Quique bloqueou. Pq?\n28/07 - Antonio criou uma nova versão do disiño segundo acordos com realizados en tajer con Rodri, Math, Mariano y Gonza.\n",
    "componente": "Ambos"
  },
  {
    "id": "task-072026-b8vsm",
    "name": "Doc24 - Ativar Roles - Config consultório",
    "jiraOrMovidesk": "https://doc24.atlassian.net/browse/DOC24-1934 44643",
    "priority": "P1",
    "owner": "Caio Augusto dos Santos",
    "status": "Finalizada",
    "category": "Funcional",
    "startDate": "22/4/2026",
    "endDate": "21/7/2026",
    "description": "Erros na configuração dos roles",
    "notes": "22/04/2026 - Tentar impedir o deploy programado para esta data. | 23/04 - Antonio falará com Rodri sobre a necessidade ou não de desenvolvimento. 05/05 - Santi atualizou que retomará o ticket",
    "componente": "Front-End"
  },
  {
    "id": "task-072026-5binq",
    "name": "UGF - Permite Voucher no válido",
    "jiraOrMovidesk": "https://doc24.atlassian.net/browse/DOC24-931",
    "priority": "P1",
    "owner": "Matheus Americo Souza Silva",
    "status": "Em QA",
    "category": "Funcional",
    "startDate": "23/6/2026",
    "endDate": "",
    "description": "UGF reporta que o paciente personal pode informar um voucher não válido",
    "notes": "Antonio realizou os testes e abriu um ticket de bug para correção do problema durante o agendamento | 24/06/2026 - Realizamos diversos testes de voucher e verificamos que a validação do voucher esta relacionanada ao parametro force_vocuher_autogestion na tabela prestadores | 25/06/2026 - Hoje mapeamos o comportamento do campo e vimos que não há validação de vocuher quando inserimos um voucher ja consumido. | 26/06/2026 - Vimos também que o parametro force_vocuher_autogetion s ecomporta de forma universal dado que show_voucher esteja desativado valida voucher, portanto também deverá ser aberto tickets para correção destes dois temas. | 26/06/2026 - Tickets abertos e prontos para serem avaliados na reunião com os analistas AF's - 03/07 Refinado o ticket, para planning que será realizada em 06/07 - Foi direcionado para fila do desenvolvedor hoje 06/07 na planning.",
    "componente": "Back-End"
  },
  {
    "id": "task-072026-tcgr6",
    "name": "UGF - Chat Integrado",
    "jiraOrMovidesk": "28071",
    "priority": "P1",
    "owner": "Matheus Americo Souza Silva",
    "status": "Finalizada",
    "category": "Funcional",
    "startDate": "25/3/2026",
    "endDate": "26/3/2026",
    "description": "Evoluir a funcionalidade de consultas de texto, para que atenda o chat integrado entre pacientes e médicos",
    "notes": "Neste momento consta em desenvolvimento o modulo do profissional. Assim que terminado, realizar testes. - | 07/07 - feito teste do chat integrado, entretanto matheus identificou que nos testes quando a consulta era finalizada, não recebia o e-mail de fim de consulta. QA esta validando se é algum tema de configuração, em paralelo conferir HTML de fim de consulta de testes da UGF | 13/07 - Adicionar comentario no ticket sobre o ESTADO de como o chat é criado no banco",
    "componente": "Back-End"
  },
  {
    "id": "task-072026-ltisu",
    "name": "sendHook Meli - PDF MEVO/MEMED",
    "jiraOrMovidesk": "https://doc24.movidesk.com/Ticket/Edit/47154",
    "priority": "P1",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Ag. Desenvolvimento",
    "category": "Suporte L2",
    "startDate": "22/6/2026",
    "endDate": "",
    "description": "Um novo controlador foi criado, chamado de sendHookMeli Memed, porém obtem erro no serviço da MEMED, informando que a receita não existe",
    "notes": "Antonio conversou com Juli e irá realizar os testes. Após mapeamento correto da integração, Antonio irá criar un novo ticket, e incorporar MEVO (S3). Antonio realiou os testes no endpoint MELI, e obtevo erro. O suporte da MEMED foi acionado. - 06/07 necesario acompanhar com operações na terça feira 07/07 para testar processo de notificação da prescrição. | 10/07 - teste realizado, prescrição continua mantendo padrão doc24 e não link  memed. 27/07 - Antonio Armou um novo ticket para revisar, pois aparentemente estamos guardando o id_prescripcion errado na tabela (https://doc24.atlassian.net/browse/DOC24-2170). ",
    "componente": "Back-End"
  },
  {
    "id": "task-072026-heagx",
    "name": "BUG - Foto do paciente na auditoria",
    "jiraOrMovidesk": "https://doc24.movidesk.com/Ticket/Edit/52113 https://doc24.atlassian.net/browse/DOC24-2089",
    "priority": "P1",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Ag. Deploy",
    "category": "Suporte L2",
    "startDate": "27/6/2026",
    "endDate": "",
    "description": "Modulo de auditoria MINIAPP + Brand 1 não exibe a foto do paciente. 06/07 priorizado e direcionado a fila do desenvolvedor para andamento da correção.",
    "notes": "03/07 - foi feito refinamento deste ticket. Direcionado a planning como P0 para seguimento da correção do BUG afetando a UGF.\n27/07 -  Antonio realizou os testes e identificou que as correções realizadas solucionaram o problema.",
    "componente": "Front-End"
  },
  {
    "id": "task-072026-qnlsx",
    "name": "doc24 - Atenção OFFLINE dados do paciente",
    "jiraOrMovidesk": "https://doc24.atlassian.net/browse/DOC24-1617",
    "priority": "P1",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Ag. Deploy",
    "category": "Suporte L2",
    "startDate": "13/7/2026",
    "endDate": "",
    "description": "Desenvolvimento da aba de atenção OFFLINE para busca de dados de paciente",
    "notes": "15/07 - Foi validado e criado ticket para desenvolvimento. | 16/07 - Foi feito refinamento do ticket categorizado como 2 stories points. Aguardamos desenvolvimento\n 23/07 - Ticket em desenvolvimento. Validar se esta em homologação para fazermos os testes.\n\n28/07 - Foi acordado que a mudança do comportamento da prompt será ajustado em outro ticket (Task: \"APS - Prompt de atenção offline - Persona creada\").\nNeste momento foi corrigida a criação e duplicidade de prontuários. O ticket seguirá para deploy (Antonio)",
    "componente": "Back-End"
  },
  {
    "id": "task-072026-ee2oc",
    "name": "Atualização da documentação de API com os novos métodos atualizados com os novos parametros Nome Social e Sexo",
    "jiraOrMovidesk": "https://doc24.atlassian.net/browse/DOC24-1717?search_id=4c219647-52e7-488e-845b-c441e9c4d471",
    "priority": "P2",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Pendente",
    "category": "Suporte a integração",
    "startDate": "",
    "endDate": "",
    "description": "Atualizar todas as paginas do Hub de integrações em que contém os métodos em que forma alterados incluindo Nome Social, Sexo e Genero.",
    "notes": "Aguardando definição da lógica desenvolvida. Antonio conversará com Juli sobre o tema. Juli confirmou o rollback, e Antonio Solicitou um novo desenvolvimento. 13/04 - Aguarda deploy do desenvolvimento, para seguirmos com a atualização da documentação. Math irá aplicar os testes antes de deploy, 06/05 -  Antonio já avisou ao Juli | 10/06/2021 - Pendente verificar persistencia de genero. 29/06/2026 - Math deverá avaliar a possibilidade de criar uma nova api para listagem de generops",
    "componente": "Back-End"
  },
  {
    "id": "task-072026-lyria",
    "name": "UGF - TISS -  Envio do prefixo no CRM",
    "jiraOrMovidesk": "https://doc24.atlassian.net/browse/DOC24-1546",
    "priority": "P3",
    "owner": "Matheus Americo Souza Silva",
    "status": "Impedido",
    "category": "Funcional",
    "startDate": "5/5/2026",
    "endDate": "8/5/2026",
    "description": "Avaliar a posibilidade de enviar o prefixo junto com CRM durante a integração TISS",
    "notes": "04/05/2026 - Conforme tratado na reunião de hoje 04/05 com a UGF, há a necessidade de retomar o tema de mascara aplicada no XML de validação dos dados de profissionais, uma vez que profissionais doc24 tem o mesmo CRM que o profissional já cadastrado na UGF, mas com estado distinto, isso gera glosa de guia e não fatura atendimento. Paleativo entender a possibilidade de desenvolvimento da mascara incluida no XML com codigo alinhado com a UGF 900 a frente do CRM. | 08/05/2026 - Ticket aberto para correção do prefixo doCRM para integração TISS.",
    "componente": "Back-End"
  },
  {
    "id": "task-072026-x59xp",
    "name": "UGF - Filtro Especialidade Módulo Prestador",
    "jiraOrMovidesk": "https://doc24.movidesk.com/Ticket/Edit/44282",
    "priority": "P2",
    "owner": "Matheus Americo Souza Silva",
    "status": "Finalizada",
    "category": "Funcional",
    "startDate": "24/3/2026",
    "endDate": "21/7/2026",
    "description": "Criação do ticekt para frontend solicitando a criação do filtro Especialidade",
    "notes": "26/03/26 - Aberto ticket no Jira para desenvolvimento de front. Aguardadno priorização. | 29/03/2026 - Ticket em aberto aguardando priorização. | 12/05/2026 - Ticket de desenvolvimento assinado para inicio de desenvolvimento. | 18/16/2026 - Aguardando subida em test para seguirmos com os testes. | 24/06/2026 - Nesta data conversei com Maxi (Dev) haverá necessidade de desenvolver backend, foi aberto um ticket novo para isso. | Desenvolvido nesta data, realizamos alguns teste e vimos que a especialidade aparece em espanhol para as brands do Brasil, solicitamos correção. | 25/06/2026 - Desenvolvedor reporta que havia um bug no backend em que retornava as epsecialidades em espanhol porém já foi aplicado a correção e nesta data foi validado isso. | 26/06/2026 - Ticket alterado para aguardando deploy.",
    "componente": "Front-End"
  },
  {
    "id": "task-072026-a7zao",
    "name": "Fechas de accesso en v2/ivitacion",
    "jiraOrMovidesk": "https://doc24.atlassian.net/browse/DOC24-1855",
    "priority": "P3",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Ag. refinamento",
    "category": "Funcional",
    "startDate": "30/3/2026",
    "endDate": "2/4/2026",
    "description": "Criar um ticket no JIR para evoluir o endpoint v2/invitacion, e permitir que seja aceito dois novos parametros no endpoint, não obrigatórios, e que quando utilizadosm definem a data de inicio e fim de permissão para acesso ao link da invitacion.",
    "notes": "Tickets abertos, e aguardam priorização",
    "componente": "Back-End"
  },
  {
    "id": "task-072026-pb6bp",
    "name": "CallPet - Personalizar mensagem - usr/get-persona",
    "jiraOrMovidesk": "https://doc24.movidesk.com/Ticket/Edit/48636",
    "priority": "P0",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Finalizada",
    "category": "Funcional",
    "startDate": "22/5/2026",
    "endDate": "21/7/2026",
    "description": "Modificar a mensagem de retorno do usr/get_persona",
    "notes": "Modificar a mensagem de retorno do usr/get_persona\n\n",
    "componente": "Ambos"
  },
  {
    "id": "task-072026-eag1h",
    "name": "Bug - WH Legacy - não permite selecionar turnos futuros",
    "jiraOrMovidesk": "49088",
    "priority": "P3",
    "owner": "Caio Augusto dos Santos",
    "status": "Finalizada",
    "category": "Suporte L2",
    "startDate": "20/5/2026",
    "endDate": "",
    "description": "Bug na versão anterior do WH",
    "notes": "Caio derivou com Soledad, que solicitou a abertura de um ticket do JIRA. Após a abertura, o ticket será derivado com MArtin",
    "componente": "Mobile"
  },
  {
    "id": "task-072026-e1yy5",
    "name": "Revisar metodos de PHR  - Nome social, sexo e genero",
    "jiraOrMovidesk": "-",
    "priority": "P2",
    "owner": "Matheus Americo Souza Silva",
    "status": "Pendente",
    "category": "Funcional",
    "startDate": "23/4/2026",
    "endDate": "",
    "description": "Existem metodos do PHR que foram considerados e outros metodos que não foram. Avaliar e criar um novo ticket para inclusão dos metodos ausentes",
    "notes": "30/04/2026 - Foi analisado os seguintes métodos e rotas: | - admin/phr-paciente/   método: GET ws/admin/get-phr-datos-paciente | - medico/phr-paciente/ método: ws/med/get-phr-datos-paciente | - POST v2/phr/historial-paciente-externo | 08/05/2026 - Retomando o tema para analise de PHR, foi verificado que não havia aberto ticket para inclusão do Nome Social no modulo de sessão de médicos no que se refere a PHR, hoje deverá ser aberto ticket. | 10/06/2026 - Analise de PHR para nome social / Sexo e genero: Incluir o Nome Social no Modal do PHR em 'paciente/ver-phr/seleccionar-persona | método POST pte/personas-asociadas/agregar",
    "componente": "Ambos"
  },
  {
    "id": "task-072026-ibs7j",
    "name": "MEVO - Nome social do paciete",
    "jiraOrMovidesk": "https://doc24.movidesk.com/Ticket/Edit/47910",
    "priority": "P3",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Finalizada",
    "category": "Funcional",
    "startDate": "4/5/2026",
    "endDate": "17/7/2026",
    "description": "Incluir o nome social do paciente na MEVO",
    "notes": "Segundo a MEVO, já foi implementada a solução para o paciente",
    "componente": "Back-End"
  },
  {
    "id": "task-072026-clvyx",
    "name": "MEMED - Dados de Alergia",
    "jiraOrMovidesk": "-",
    "priority": "P2",
    "owner": "Matheus Americo Souza Silva",
    "status": "Pendente",
    "category": "Funcional",
    "startDate": "",
    "endDate": "",
    "description": "Integrar dados de alergia para a memed",
    "notes": "Integrar os dados de alergia cadastrados no PHR para a MEMED",
    "componente": "Back-End"
  },
  {
    "id": "task-072026-dkbs9",
    "name": "API - Importar PHR",
    "jiraOrMovidesk": "https://doc24.atlassian.net/browse/DOC24-1990",
    "priority": "P3",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Finalizada",
    "category": "Funcional",
    "startDate": "1/7/2026",
    "endDate": "17/7/2026",
    "description": "Novo fluxo de integração para viabilizar a importação de PHRs po APIs no mercado BR",
    "notes": "Foi modificada a relação de campos obrigatórios para permitir que os protocolos de atendimento sejam importados nas brands do BR",
    "componente": "Back-End"
  },
  {
    "id": "task-072026-7llop",
    "name": "MEMED - Nome social",
    "jiraOrMovidesk": "https://doc24.atlassian.net/browse/DOC24-1171",
    "priority": "P3",
    "owner": "Matheus Americo Souza Silva",
    "status": "Ag. Priorização",
    "category": "Funcional",
    "startDate": "6/5/2026",
    "endDate": "",
    "description": "Avaliar a inclusão do nome social na prescrição MEMED, assim como será feito para a MEVO",
    "notes": "Antonio entrou em contato com a MEMED para obter a documentação. Irá analisar e abrir os tickets quando concluída a analise. | 10/06/2026 - Inicio da escrita e refinamento do ticket.",
    "componente": "Ambos"
  },
  {
    "id": "task-072026-fv6fe",
    "name": "MediPreço - Ativar parceria",
    "jiraOrMovidesk": "https://doc24.movidesk.com/Ticket/Edit/42470",
    "priority": "P1",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Finalizada",
    "category": "Funcional",
    "startDate": "18/3/2026",
    "endDate": "2026-07-29",
    "description": "Ativar oferta do produto Medipreço para os pacientes ao final da consulta",
    "notes": "17/03/2026 Marcia solciitou orientações sobre os termos de aceite. Antonio irá montar um exemplo e comparilhar com ela. 23/03/2026 - Antonio fez a devolutiva de exemplos dos termos de aceite. 202/04 - Disponibilizado para testes e Antonio fará a execução de testes. Antonio estará apoiando o Diego e Lucio. Lucio apontou erro ao incorporar o link por iframe, e Antonio derivou con Medipreço. Lucio tambem comentou sobre o erro da codification_response não ser respeitado pelo front. 02/06/2026 - Se identificó que a receita compartilhada com a medipreço, esta fora do padão da MEMED/MEVO, ou seja, é enviada a receita no formato do prescritor doc24.\n29/07 - Deploy realizado na versão corretora 2026.07.09",
    "componente": "Ambos"
  },
  {
    "id": "task-072026-aicl6",
    "name": "Replicar protocolos de atendimento",
    "jiraOrMovidesk": "",
    "priority": "P3",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Em QA",
    "category": "Funcional",
    "startDate": "",
    "endDate": "",
    "description": "Desenhar a solução que permita replicar ou criar protocolos de atendimento para todos os miniaps",
    "notes": "Desenhar uma melhoria no módulo de protocolos de atendimento, para permitir que protocolos criados sejam replicados em todas as brands",
    "componente": "Ambos"
  },
  {
    "id": "task-072026-cqxmq",
    "name": "Nova funcionalidade - Buscar receitas",
    "jiraOrMovidesk": "https://doc24.atlassian.net/browse/DOC24-1811",
    "priority": "P3",
    "owner": "Vic",
    "status": "Ag. Desenvolvimento",
    "category": "Funcional",
    "startDate": "",
    "endDate": "",
    "description": "Nova funcionalidade para acompanhamento e download das receitas MEVO/MEMED",
    "notes": "Apenas acompanhamento. 06/07 - assignado a fila do desenvolvedor.",
    "componente": "Ambos"
  },
  {
    "id": "task-072026-pgat0",
    "name": "UGF - Criação de nova especialidade",
    "jiraOrMovidesk": "54718",
    "priority": "P2",
    "owner": "Caio Augusto dos Santos",
    "status": "Finalizada",
    "category": "Suporte L2",
    "startDate": "15/7/2026",
    "endDate": "17/7/2026",
    "description": "Criação da especialidade Cirurgia do Aperelho digestivo",
    "notes": "14/07 - Tiago solicita a criação de uma nova especialidade medica para atendimento.",
    "componente": "Ambos"
  },
  {
    "id": "task-072026-qqbzg",
    "name": "Remover a obrigatoriedade do nome social medico",
    "jiraOrMovidesk": "https://doc24.atlassian.net/browse/DOC24-1931",
    "priority": "P3",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Ag. Desenvolvimento",
    "category": "Suporte L2",
    "startDate": "2026-07-10",
    "endDate": "",
    "description": "Remover a obrigatoriedade do nome social dos médicos",
    "notes": "Atualmente no cadastro dos profissionais, existe a obrigatoriedade da informação do nome social. Em conjunto, foi identificado que o formulário simplificado não possui a informação a ser registrada. As modificações foram solicitadas no ticket do JIRA",
    "componente": "Front-End"
  },
  {
    "id": "task-072026-1784721953282",
    "name": "APS - Nomenclaturas médicas para não médicos",
    "jiraOrMovidesk": "https://doc24.atlassian.net/browse/DOC24-2159",
    "priority": "P0",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Ag. Desenvolvimento",
    "category": "Funcional",
    "startDate": "2026-07-22",
    "endDate": "",
    "description": "O produto APS evidenciou diversas pendencias de ajustes para a exibição (Em tela ou documentos) de nomenclaturas médicas a profissionais não médicos, como por exemplo o uso do RQE, CRM ou labels estáticas para \"DR(a)\"",
    "notes": "Antonio esta armando os tickets de ajustes. Um novo épico será aberto, para centralizar as evoluções/correções derivadas do APS",
    "componente": "Back-End"
  },
  {
    "id": "task-072026-1784743696448",
    "name": "Doc24 - Nome social do profissional",
    "jiraOrMovidesk": "",
    "priority": "P1",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Pendente",
    "category": "Funcional",
    "componente": "Ambos",
    "startDate": "2026-07-22",
    "endDate": "",
    "description": "O nome social do profissional não esta sendo exibido como prioridade nos módulos e ferramentas da doc24.",
    "notes": "22/07 - Carol reportou ao Antonio que existe um caso real na doc24 desde 2025 e até o momento, o tema não foi priorizado. Antonio realizará o mapeamento e criará os tickets."
  },
  {
    "id": "task-072026-1784900509622",
    "name": "APS - Pdfs com RQE em profissionais não médicos",
    "jiraOrMovidesk": "https://doc24.atlassian.net/browse/DOC24-2162",
    "priority": "P0",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Ag. Priorização",
    "category": "Suporte L2",
    "componente": "Back-End",
    "startDate": "2026-07-23",
    "endDate": "",
    "description": "PDFs de final de consulta permanecem listando a matrícula de profissionais não médicos como RQE, ocasionando em possíveis riscos legais",
    "notes": "PDFs de final de consulta permanecem listando a matrícula de profissionais não médicos como RQE, ocasionando em possíveis riscos legais\n\n"
  },
  {
    "id": "task-072026-1785166809727",
    "name": "APS - Prompt de atenção offline - Persona creada",
    "jiraOrMovidesk": "https://doc24.atlassian.net/browse/DOC24-2190",
    "priority": "P1",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Ag. Priorização",
    "category": "Funcional",
    "componente": "Back-End",
    "startDate": "",
    "endDate": "",
    "description": "Criar um novo ticket para melhoria na prompt do paciente, na página de atenção offline, solicitando que considere pacientes já criados, independente de ter ou não consultas já finalizadas.",
    "notes": "28/07 - Foi acordada a modificação do comportamento da prompt, para que seja considerara a entidade persona, via parametro. Um novo ticket precisará ser aberto para tal."
  },
  {
    "id": "task-072026-1785167129970",
    "name": "BUG - Job para finalizar consultas ",
    "jiraOrMovidesk": "",
    "priority": "P3",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Pendente",
    "category": "Suporte L2",
    "componente": "Back-End",
    "startDate": "",
    "endDate": "",
    "description": "Ticket de Bug para revisar e corrigir a JOB de finalização das consultas ",
    "notes": "Foi identificado falha na job que realiza a finalização de consultas, onde uma consulta permaneceu com status <> 'F', memso com fecha_baja"
  },
  {
    "id": "task-072026-1785167361913",
    "name": "Medipreço - Integrar elegibilidade",
    "jiraOrMovidesk": "",
    "priority": "P2",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Pendente",
    "category": "Funcional",
    "componente": "Back-End",
    "startDate": "",
    "endDate": "",
    "description": "Desenvolver a integração de elegibilidade para o serviço da MediPreço.",
    "notes": "Analisar e documentar a integração de elegibilidade da medipreço"
  },
  {
    "id": "task-072026-1785241008244",
    "name": "MEMED - Refresh de template do profissional",
    "jiraOrMovidesk": "https://doc24.atlassian.net/browse/DOC24-2185",
    "priority": "P2",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Ag. Priorização",
    "category": "Funcional",
    "componente": "Back-End",
    "startDate": "2026-07-29",
    "endDate": "",
    "description": "",
    "notes": "Foi reportado por UGF que profissionais utilizaram o template UGF na MEMED, mesmo para atendimentos de outras Brands. Deverá ser considerada uma solução de contorno ao problema."
  },
  {
    "id": "task-072026-1785244835827",
    "name": "Nexus24h - Alteração do certificado",
    "jiraOrMovidesk": "https://doc24.atlassian.net/browse/DOC24-1583",
    "priority": "P1",
    "owner": "Matheus Americo Souza Silva",
    "status": "Finalizada",
    "category": "Suporte L2",
    "componente": "Back-End",
    "startDate": "",
    "endDate": "",
    "description": "",
    "notes": ""
  },
  {
    "id": "task-072026-1785244933722",
    "name": "APS - Configuração de filas do WhatsApp no movidesk",
    "jiraOrMovidesk": "",
    "priority": "P1",
    "owner": "Caio Augusto dos Santos",
    "status": "Finalizada",
    "category": "Suporte L2",
    "componente": "Back-End",
    "startDate": "2026-07-23",
    "endDate": "2026-07-23",
    "description": "",
    "notes": ""
  },
  {
    "id": "task-072026-1785266466768",
    "name": "Cadastro de profissionais - Ajustes no protótipo",
    "jiraOrMovidesk": "",
    "priority": "P0",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Finalizada",
    "category": "Funcional",
    "componente": "Front-End",
    "startDate": "2026-07-28",
    "endDate": "2026-07-28",
    "description": "",
    "notes": "Antonio realizou as modificações no prototipo, segundo o acordado abaixo en tajer: \nModalidad: El radiobutton debe poder permitir informar ‘Guardia', ‘Programada’ o 'Todas’. \nEspecialidad: El control no debe ocorrir por especialidad, entonces se borró todos los insputs y controles por especialidad.\nControoler de Chat y Video: Borrar el control de los parámetros de Chat y Video. No se va hacer en esta versión.\nBotón para activar el profesional: Se cambió el botón para activar el profesional, porque el registro de bloqueado/Blacklist puede ser borrado, y no significa que vá a ser incluido en profesionales_brands habilitados."
  },
  {
    "id": "task-072026-1785271114553",
    "name": "MELI - Atestados x Recetas",
    "jiraOrMovidesk": "https://doc24.atlassian.net/browse/DOC24-2188",
    "priority": "P1",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Ag. refinamento",
    "category": "Suporte L2",
    "componente": "Ambos",
    "startDate": "2026-07-28",
    "endDate": "",
    "description": "Deverá ser mapeado e identificado os problemas reportados por MELI, uma vez que houveram acionamentos diferentes a Nacho e Quique. Tanto Antonio, quanto Juli estão tentando entender o ocorrido e mapear os problemas.",
    "notes": "Deverá ser mapeado e identificado os problemas reportados por MELI, uma vez que houveram acionamentos diferentes a Nacho e Quique. Tanto Antonio, quanto Juli estão tentando entender o ocorrido e mapear os problemas.\n\n"
  },
  {
    "id": "task-072026-1785329409108",
    "name": "doc24 | Bug de traducción en el reporte de produccion",
    "jiraOrMovidesk": "https://doc24.atlassian.net/browse/DOC24-2088",
    "priority": "P2",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Finalizada",
    "category": "Suporte L2",
    "componente": "Back-End",
    "startDate": "2026-06-25",
    "endDate": "2026-07-29",
    "description": "Erro de tradução ao baixar o relatório de produção via admin",
    "notes": "Desenvolvido e corrigido pela versão corretora 2026.07.09"
  },
  {
    "id": "task-072026-1785437709200",
    "name": "WH - Sitio Saúde - Cadastro de especialidades",
    "jiraOrMovidesk": "https://doc24.movidesk.com/Ticket/Edit/53980",
    "priority": "P0",
    "owner": "Caio Augusto dos Santos",
    "status": "Em andamento",
    "category": "Suporte L2",
    "componente": "Ambos",
    "startDate": "2026-07-30",
    "endDate": "",
    "description": "Problema de cadastro de especialidade no WH",
    "notes": "30/07 - Cliente reclama de processo de configuração da plataforma, onde o paciente e o cliente não pode ver a lista de especialidades e profissionais doc24 junto com as especialidades a qual havia sido contratada.\n31/07 - Caio irá testar o app"
  },
  {
    "id": "task-072026-1785438508219",
    "name": "UGF - Criação de convite por modulo medico e prestador",
    "jiraOrMovidesk": "https://doc24.movidesk.com/Ticket/Edit/56612",
    "priority": "P1",
    "owner": "Caio Augusto dos Santos",
    "status": "Ag. Priorização",
    "category": "Suporte L2",
    "componente": "Ambos",
    "startDate": "2026-07-29",
    "endDate": "",
    "description": "Erro ao agendar paciente por modulo medico ",
    "notes": "29/07 - Ugf reclama em grupo de WhatsApp de agendamento realizado sem geração de guia. Quando o paciente é agendado pelo modulo medico, e a carteirinha é digitada com ponto e traço, o turno não é agendado e não é validado na TISS. Possível correção é travar o agendamento caso o documento seja preenchido fora do padrão com pontos e traços, não permitindo a conclusão do mesmo."
  },
  {
    "id": "task-072026-1785522923444",
    "name": "ARG - Revisar Alta do profissional BR x ARG",
    "jiraOrMovidesk": "",
    "priority": "P2",
    "owner": "Antônio Gonçalves Almeida Batista",
    "status": "Pendente",
    "category": "Funcional",
    "componente": "Back-End",
    "startDate": "",
    "endDate": "",
    "description": "Revisar a página de cadastro do profissional, modificar a origem dos parâmetros por idioma",
    "notes": ""
  }
];

export const defaultDatasAvisos: any = {
  "feriasDayOffs": [
    {
      "id": "fdo-101",
      "colaborador": "Caio Augusto",
      "tipo": "Férias",
      "dataInicio": "2026-12-21",
      "dataFim": "2026-12-30",
      "observacao": "Férias",
      "status": "Previsto"
    },
    {
      "id": "fdo-102",
      "colaborador": "Matheus Americo",
      "tipo": "Férias",
      "dataInicio": "2026-08-03",
      "dataFim": "2026-08-12",
      "observacao": "Férias",
      "status": "Confirmado"
    },
    {
      "id": "fdo-103",
      "colaborador": "Matheus Americo",
      "tipo": "Férias",
      "dataInicio": "2026-10-19",
      "dataFim": "2026-11-05",
      "observacao": "Férias",
      "status": "Previsto"
    },
    {
      "id": "fdo-105",
      "colaborador": "Antonio Gonçalves Almeida Batista",
      "tipo": "Férias",
      "dataInicio": "2026-07-06",
      "dataFim": "2026-07-15",
      "observacao": "Férias",
      "status": "Confirmado"
    },
    {
      "id": "fdo-1785326275093",
      "colaborador": "Antonio Gonçalves Almeida Batista",
      "tipo": "DayOff",
      "dataInicio": "2026-09-01",
      "dataFim": "2026-09-30",
      "status": "Previsto",
      "observacao": "Possível cirurgia - Em revisão"
    },
    {
      "id": "fdo-1786560266578",
      "colaborador": "Victoria Figini",
      "tipo": "Férias",
      "dataInicio": "2026-09-03",
      "dataFim": "2026-09-13",
      "status": "Previsto",
      "observacao": ""
    },
    {
      "id": "fdo-1787578917747",
      "colaborador": "Antônio Gonçalves Almeida Batista",
      "tipo": "DayOff",
      "dataInicio": "2026-09-03",
      "dataFim": "2026-09-03",
      "status": "Previsto",
      "observacao": "Pedido de dayoff"
    },
    {
      "id": "fdo-1787775083751",
      "colaborador": "Matheus Americo Souza Silva",
      "tipo": "DayOff",
      "dataInicio": "2026-09-08",
      "dataFim": "2026-09-08",
      "status": "Previsto",
      "observacao": "DayOff"
    }
  ],
  "ausenciasTemporarias": [
    {
      "id": "aus-201",
      "colaborador": "Caio Augusto",
      "motivo": "Consulta Médica",
      "data": "2026-07-29",
      "horarioInicio": "08:00",
      "horarioFim": "11:00",
      "observacao": "Consulta"
    },
    {
      "id": "aus-202",
      "colaborador": "Antonio Gonçalves Almeida Batista",
      "motivo": "Consulta Médica",
      "data": "2026-07-23",
      "horarioInicio": "15:00",
      "horarioFim": "17:00",
      "observacao": "Consulta médica"
    },
    {
      "id": "aus-1785158680773",
      "colaborador": "Matheus Americo",
      "motivo": "Compromisso Pessoal",
      "data": "2026-07-27",
      "horarioInicio": "12:00",
      "horarioFim": "18:00",
      "observacao": "Médico "
    },
    {
      "id": "aus-1786369953793",
      "colaborador": "Caio Augusto dos Santos",
      "motivo": "Compromisso Pessoal",
      "data": "2026-08-11",
      "horarioInicio": "08:00",
      "horarioFim": "09:00",
      "observacao": "Faculdade"
    },
    {
      "id": "aus-1786369995767",
      "colaborador": "Caio Augusto dos Santos",
      "motivo": "Consulta Médica",
      "data": "2026-08-19",
      "horarioInicio": "08:00",
      "horarioFim": "12:00",
      "observacao": "Exame"
    },
    {
      "id": "aus-1786370024165",
      "colaborador": "Antônio Gonçalves Almeida Batista",
      "motivo": "Consulta Médica",
      "data": "2026-08-12",
      "horarioInicio": "08:00",
      "horarioFim": "10:00",
      "observacao": "Exames"
    },
    {
      "id": "aus-1786648774838",
      "colaborador": "Caio Augusto dos Santos",
      "motivo": "Consulta Médica",
      "data": "2026-09-16",
      "horarioInicio": "10:00",
      "horarioFim": "12:00",
      "observacao": "consulta medica"
    },
    {
      "id": "aus-1786648830367",
      "colaborador": "Matheus Americo Souza Silva",
      "motivo": "Consulta Médica",
      "data": "2026-08-20",
      "horarioInicio": "10:00",
      "horarioFim": "12:00",
      "observacao": ""
    },
    {
      "id": "aus-1787578879183",
      "colaborador": "Antônio Gonçalves Almeida Batista",
      "motivo": "Consulta Médica",
      "data": "2026-08-26",
      "horarioInicio": "10:00",
      "horarioFim": "15:00",
      "observacao": "Exames pré-cirurgicos."
    }
  ],
  "deploys": [
    {
      "id": "dep-1785180242493",
      "data": "2026-07-29",
      "versao": "2026.07.09",
      "componente": "Back-End",
      "link": "https://doc24.atlassian.net/wiki/x/AYC4F"
    },
    {
      "id": "dep-1785180281428",
      "data": "2026-07-30",
      "versao": "2026.07.09",
      "componente": "Front-End",
      "link": "https://doc24.atlassian.net/wiki/x/AYC4F"
    },
    {
      "id": "dep-1786556404065",
      "data": "2026-08-12",
      "versao": "2026.08.06",
      "componente": "Back-End",
      "link": "https://doc24.atlassian.net/wiki/spaces/ID/pages/360546305/Informe+Front+Back+-+Tickets+de+la+versi+n+2026.08.06"
    },
    {
      "id": "dep-1786556427208",
      "data": "2026-08-13",
      "versao": "2026.08.06",
      "componente": "Front-End",
      "link": "https://doc24.atlassian.net/wiki/spaces/ID/pages/360546305/Informe+Front+Back+-+Tickets+de+la+versi+n+2026.08.06"
    },
    {
      "id": "deploy-1787578130373",
      "data": "2026-08-26",
      "versao": "2026.08.13",
      "componente": "Back-End",
      "link": "https://doc24.atlassian.net/browse/DOC24-2185"
    },
    {
      "id": "deploy-1787578181093",
      "data": "2026-08-26",
      "versao": "2026.08.13",
      "componente": "Back-End",
      "link": "https://doc24.atlassian.net/browse/DOC24-2188"
    },
    {
      "id": "deploy-1787578235548",
      "data": "2026-08-26",
      "versao": "2026.08.13",
      "componente": "Back-end",
      "link": "https://doc24.atlassian.net/browse/DOC24-2194"
    }
  ]
};

export const defaultUsuarios: any = [
  {
    "username": "admin",
    "name": "Antônio Gonçalves Almeida Batista",
    "role": "Admin",
    "password": "admin123"
  },
  {
    "username": "caio.augusto",
    "name": "Caio Augusto dos Santos",
    "role": "Analista",
    "password": "caio123"
  },
  {
    "username": "matheus.americo",
    "name": "Matheus Americo Souza Silva",
    "role": "Analista",
    "password": "matheus123"
  },
  {
    "username": "convidado",
    "name": "Convidado Gerencial",
    "role": "Convidado",
    "password": "convidado123"
  },
   {
    "username": "vic",
    "name": "Victoria Figini",
    "role": "Admin",
    "password": "vic123"
  },
   {
    "username": "juanma",
    "name": "Juanma",
    "role": "Admin",
    "password": "juanma123"
  }
];

export const defaultRolesPermissions: any = {
  "roles": {
    "Admin": {
      "description": "Acesso total ao sistema, configuração de períodos e exclusão.",
      "permissions": {
        "tasks": ["create", "read", "update", "delete"],
        "periods": ["create", "read", "update"],
        "users": ["create", "read", "update", "delete"],
        "lock_control": ["bypass", "release"],
        "planning_refinement": ["create", "read", "update", "delete"],
        "pocketknife_tools": ["read", "use", "status_report"],
        "status_report": ["create", "read", "export"]
      }
    },
    "Analista": {
      "description": "Pode operar as tarefas do dia a dia, sem permissão de exclusão.",
      "permissions": {
        "tasks": ["create", "read", "update"],
        "periods": ["read"],
        "users": ["read"],
        "lock_control": [],
        "planning_refinement": ["create", "read", "update"],
        "pocketknife_tools": ["read", "use"]
      }
    },
    "Convidado": {
      "description": "Acesso estrito de leitura para auditoria e acompanhamento.",
      "permissions": {
        "tasks": ["read"],
        "periods": ["read"],
        "users": ["read"],
        "lock_control": [],
        "planning_refinement": ["read"]
      }
    }
  }
};

export const defaultPlanning: any = [
  {
    "id": "plan-1784656894251",
    "atividade": "NINA | v2/schedule/report-anonymous-new no lista turnos NOSHOW",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1907",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Impedido",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "plan-1784656894934",
    "atividade": "55 UNIMED Florianópolis - Cambiar informaciones de \"descricao\" en JMJ",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1922",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Finalizada",
    "storyPoint": "1",
    "periodId": "072026"
  },
  {
    "id": "plan-1784656895560",
    "atividade": "MEVO - Envio do titulo profissional",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1980",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Finalizada",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "plan-1784656897374",
    "atividade": "UNIMED Florianópolis - FE - Flujo personal en v2/sesion",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1919",
    "priority": "P0",
    "componente": "Front-End",
    "estado": "Impedido",
    "storyPoint": "",
    "periodId": "072026"
  },
  {
    "id": "plan-1784656898371",
    "atividade": "FE | Leão Vida 587 | Nuevo Lenguaje de loco",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1582?search_id=ff796a73-c551-4b19-b35e-6a20e62522c3&referrer=quick-find",
    "priority": "P0",
    "componente": "Front-End",
    "estado": "Finalizada",
    "storyPoint": "1",
    "periodId": "072026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656899418",
    "atividade": "Florianópolis 55 | Doctor-U | Envio TyC de InterAll en la cabina",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1893",
    "priority": "P1",
    "componente": "Android",
    "estado": "Ag. Deploy",
    "storyPoint": "2",
    "periodId": "072026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656900273",
    "atividade": "Unimed 55 | BE | Corrección de Desactivación en el Flujo de Guardia",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1551",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Finalizada",
    "storyPoint": "2",
    "periodId": "072026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656901276",
    "atividade": "Unimed FL 55 | Doctor-U | Implementación del Nuevo Flujo para clientes Intercambio",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-792",
    "priority": "P1",
    "componente": "Android",
    "estado": "Assignado",
    "storyPoint": "3",
    "periodId": "072026"
  },
  {
    "id": "plan-1784656901874",
    "atividade": "Unimed FL 55 | Doctor-U | Otimização do Fluxo de Agendamento - Cabine Doctor-U",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1549",
    "priority": "P1",
    "componente": "Android",
    "estado": "Assignado",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "plan-1784656903248",
    "atividade": "v2/phr/historial-paciente-externo - Importar PHR",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1990",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Assignado",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "plan-1784656904214",
    "atividade": "Front-End - Filtro de empresa no funciona en Reporte producción",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1932",
    "priority": "P2",
    "componente": "Front-End",
    "estado": "Assignado",
    "storyPoint": "1",
    "periodId": "072026"
  },
  {
    "id": "plan-1784656905159",
    "atividade": "Calerie | Backend persistiendo los datos de pacientes con caracteres minúsculos",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1466",
    "priority": "P2",
    "componente": "Back-End",
    "estado": "Assignado",
    "storyPoint": "1",
    "periodId": "072026"
  },
  {
    "id": "plan-1784656906073",
    "atividade": "Doc24 | Corrección de la Visualización de la Credencial (Carteirinha) para Afiliados",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1611",
    "priority": "P0",
    "componente": "Front-End",
    "estado": "Finalizada",
    "storyPoint": "1",
    "periodId": "072026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656907178",
    "atividade": "doc24 | FE | Cambiar la mensaje de respuesta en usr/get-persona",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2000",
    "priority": "P1",
    "componente": "Front-End",
    "estado": "Assignado",
    "storyPoint": "1",
    "periodId": "072026"
  },
  {
    "id": "plan-1784656908149",
    "atividade": "doc24 | BE | Cambiar la mensaje de respuesta en usr/get-persona",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1993",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Assignado",
    "storyPoint": "1",
    "periodId": "072026"
  },
  {
    "id": "plan-1784656908956",
    "atividade": "BE | Integrar receta MEMED/MEVO con Medipreco",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1781",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Finalizada",
    "storyPoint": "3",
    "periodId": "072026"
  },
  {
    "id": "plan-1784656909940",
    "atividade": "doc24 | BE | Bug de traducción en el reporte de Produccion",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2088",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Finalizada",
    "storyPoint": "3",
    "periodId": "072026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656911106",
    "atividade": "doc24 | snapshot_paciente no disponible en Admin/auditoria y Admin/auditoria-miniapp",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2089",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Finalizada",
    "storyPoint": "2",
    "periodId": "072026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656912186",
    "atividade": "DOC24  | Ajuste en PDFs de Reposo",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-722",
    "priority": "P2",
    "componente": "Back-End",
    "estado": "Assignado",
    "storyPoint": "3",
    "periodId": "072026"
  },
  {
    "id": "plan-1784656913152",
    "atividade": "Mevo - BE - Nombre solcial del paciente",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1938",
    "priority": "P2",
    "componente": "Back-End",
    "estado": "Assignado",
    "storyPoint": "1",
    "periodId": "072026"
  },
  {
    "id": "plan-1784656914095",
    "atividade": "Unimed FL 55 | BE | Validación Condicional de Voucher para Guardia / Programada",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-931",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Finalizada",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "plan-1784656914571",
    "atividade": "BE - Nueva sesión paciente para reserva turno con especialista",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1764",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Assignado",
    "storyPoint": "8",
    "periodId": "072026"
  },
  {
    "id": "plan-1784656915853",
    "atividade": "Búsqueda de prescripción en PHR",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1821",
    "priority": "P1",
    "componente": "Front-End",
    "estado": "Assignado",
    "storyPoint": "3",
    "periodId": "072026"
  },
  {
    "id": "plan-1784656917406",
    "atividade": "Búsqueda Unificada de Paciente en Atención Offline",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1617",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Finalizada",
    "storyPoint": "2",
    "periodId": "072026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656917865",
    "atividade": "Unimed FL 55 | BE | Gestión de Registro de Profesionales",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-793",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Ag. Deploy",
    "storyPoint": "8",
    "periodId": "072026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656919248",
    "atividade": "FE - Seleccionar reserva turno con especialista en la derivación de la vc",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1763",
    "priority": "P1",
    "componente": "Front-End",
    "estado": "Assignado",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "plan-1784656919594",
    "atividade": "doc24 | BE | Nueva API - GET v2/Diagnosticos",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1207",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Assignado",
    "storyPoint": "3",
    "periodId": "072026",
    "owner": "Antonio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656920669",
    "atividade": "doc24 | BE | Nueva API - GET v2/Alergias",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1787",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Assignado",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "plan-1784656921561",
    "atividade": "doc24 | FE | Exibir ubicacion y emergencia en la consulta virtual",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2113",
    "priority": "P1",
    "componente": "Front-End",
    "estado": "Assignado",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "plan-1784656922934",
    "atividade": "doc24 | BE | v2/phr/historial-paciente-externo borrar crear nuevo objecto \"datos_salud_cronica\"",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2085",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Assignado",
    "storyPoint": "3",
    "periodId": "072026"
  },
  {
    "id": "plan-1784656924331",
    "atividade": "doc24 | Fecha de nacimiento en pdf usr/get-pdf-vc/",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2051",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Ag. Priorização",
    "storyPoint": "2",
    "periodId": "072026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656925028",
    "atividade": "MEMED - BE - Nombre solcial del paciente",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1171",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Ag. Priorização",
    "storyPoint": "2",
    "periodId": "072026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656925564",
    "atividade": "MEMED - FE - Nombre solcial del paciente",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1160",
    "priority": "P1",
    "componente": "Front-End",
    "estado": "Ag. Priorização",
    "storyPoint": "2",
    "periodId": "072026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656926879",
    "atividade": "Task de investigación - Roles | Error ao guardar los datos de admin/nuevos-afiliados",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2008",
    "priority": "P2",
    "componente": "Back-End",
    "estado": "Impedido",
    "storyPoint": "",
    "periodId": "072026"
  },
  {
    "id": "plan-1784900553711",
    "atividade": "APS - Pdfs com RQE em profissionais não médicos",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2162",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Em Desenvolvimento",
    "storyPoint": "3",
    "periodId": "072026",
    "owner": "Antonio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784819724507",
    "atividade": "APS - Nomenclaturas médicas para não médicos",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2159",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Ag. Deploy",
    "storyPoint": "3",
    "periodId": "072026",
    "owner": "Antonio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1785167645754",
    "atividade": "MELI - SendHook - ID_Prescripción errado",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2170",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Ag. Desenvolvimento",
    "storyPoint": "3",
    "periodId": "072026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1785326770539",
    "atividade": "doc24 | Bug de traducción en el reporte de produccion",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2088",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Finalizada",
    "storyPoint": "3",
    "periodId": "072026"
  },
  {
    "id": "plan-1784656894934",
    "atividade": "55 UNIMED Florianópolis - Cambiar informaciones de \"descricao\" en JMJ",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1922",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Finalizada",
    "storyPoint": "1",
    "periodId": "082026"
  },
  {
    "id": "plan-1784656895560",
    "atividade": "MEVO - Envio do titulo profissional",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1980",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Finalizada",
    "storyPoint": "2",
    "periodId": "082026"
  },
  {
    "id": "plan-1784656898371",
    "atividade": "FE | Leão Vida 587 | Nuevo Lenguaje de loco",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1582?search_id=ff796a73-c551-4b19-b35e-6a20e62522c3&referrer=quick-find",
    "priority": "P0",
    "componente": "Front-End",
    "estado": "Finalizada",
    "storyPoint": "1",
    "periodId": "082026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656899418",
    "atividade": "Florianópolis 55 | Doctor-U | Envio TyC de InterAll en la cabina",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1893",
    "priority": "P1",
    "componente": "Android",
    "estado": "Ag. Deploy",
    "storyPoint": "2",
    "periodId": "082026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656900273",
    "atividade": "Unimed 55 | BE | Corrección de Desactivación en el Flujo de Guardia",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1551",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Finalizada",
    "storyPoint": "2",
    "periodId": "082026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656901276",
    "atividade": "Unimed FL 55 | Doctor-U | Implementación del Nuevo Flujo para clientes Intercambio",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-792",
    "priority": "P1",
    "componente": "Android",
    "estado": "Assignado",
    "storyPoint": "3",
    "periodId": "082026"
  },
  {
    "id": "plan-1784656901874",
    "atividade": "Unimed FL 55 | Doctor-U | Otimização do Fluxo de Agendamento - Cabine Doctor-U",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1549",
    "priority": "P1",
    "componente": "Android",
    "estado": "Assignado",
    "storyPoint": "2",
    "periodId": "082026"
  },
  {
    "id": "plan-1784656903248",
    "atividade": "v2/phr/historial-paciente-externo - Importar PHR",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1990",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Assignado",
    "storyPoint": "2",
    "periodId": "082026"
  },
  {
    "id": "plan-1784656904214",
    "atividade": "Front-End - Filtro de empresa no funciona en Reporte producción",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1932",
    "priority": "P2",
    "componente": "Front-End",
    "estado": "Assignado",
    "storyPoint": "1",
    "periodId": "082026"
  },
  {
    "id": "plan-1784656905159",
    "atividade": "Calerie | Backend persistiendo los datos de pacientes con caracteres minúsculos",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1466",
    "priority": "P2",
    "componente": "Back-End",
    "estado": "Assignado",
    "storyPoint": "1",
    "periodId": "082026"
  },
  {
    "id": "plan-1784656906073",
    "atividade": "Doc24 | Corrección de la Visualización de la Credencial (Carteirinha) para Afiliados",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1611",
    "priority": "P0",
    "componente": "Front-End",
    "estado": "Finalizada",
    "storyPoint": "1",
    "periodId": "082026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656907178",
    "atividade": "doc24 | FE | Cambiar la mensaje de respuesta en usr/get-persona",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2000",
    "priority": "P1",
    "componente": "Front-End",
    "estado": "Assignado",
    "storyPoint": "1",
    "periodId": "082026"
  },
  {
    "id": "plan-1784656908149",
    "atividade": "doc24 | BE | Cambiar la mensaje de respuesta en usr/get-persona",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1993",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Assignado",
    "storyPoint": "1",
    "periodId": "082026"
  },
  {
    "id": "plan-1784656908956",
    "atividade": "BE | Integrar receta MEMED/MEVO con Medipreco",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1781",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Finalizada",
    "storyPoint": "3",
    "periodId": "082026"
  },
  {
    "id": "plan-1784656909940",
    "atividade": "doc24 | BE | Bug de traducción en el reporte de Produccion",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2088",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Finalizada",
    "storyPoint": "3",
    "periodId": "082026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656911106",
    "atividade": "doc24 | snapshot_paciente no disponible en Admin/auditoria y Admin/auditoria-miniapp",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2089",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Finalizada",
    "storyPoint": "2",
    "periodId": "082026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656912186",
    "atividade": "DOC24  | Ajuste en PDFs de Reposo",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-722",
    "priority": "P2",
    "componente": "Back-End",
    "estado": "Assignado",
    "storyPoint": "3",
    "periodId": "082026"
  },
  {
    "id": "plan-1784656913152",
    "atividade": "Mevo - BE - Nombre solcial del paciente",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1938",
    "priority": "P2",
    "componente": "Back-End",
    "estado": "Assignado",
    "storyPoint": "1",
    "periodId": "082026"
  },
  {
    "id": "plan-1784656914095",
    "atividade": "Unimed FL 55 | BE | Validación Condicional de Voucher para Guardia / Programada",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-931",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Finalizada",
    "storyPoint": "2",
    "periodId": "082026"
  },
  {
    "id": "plan-1784656914571",
    "atividade": "BE - Nueva sesión paciente para reserva turno con especialista",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1764",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Assignado",
    "storyPoint": "8",
    "periodId": "082026"
  },
  {
    "id": "plan-1784656915853",
    "atividade": "Búsqueda de prescripción en PHR",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1821",
    "priority": "P1",
    "componente": "Front-End",
    "estado": "Assignado",
    "storyPoint": "3",
    "periodId": "082026"
  },
  {
    "id": "plan-1784656917406",
    "atividade": "Búsqueda Unificada de Paciente en Atención Offline",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1617",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Finalizada",
    "storyPoint": "2",
    "periodId": "082026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656917865",
    "atividade": "Unimed FL 55 | BE | Gestión de Registro de Profesionales",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-793",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Ag. Deploy",
    "storyPoint": "8",
    "periodId": "082026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656919248",
    "atividade": "FE - Seleccionar reserva turno con especialista en la derivación de la vc",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1763",
    "priority": "P1",
    "componente": "Front-End",
    "estado": "Assignado",
    "storyPoint": "2",
    "periodId": "082026"
  },
  {
    "id": "plan-1784656919594",
    "atividade": "doc24 | BE | Nueva API - GET v2/Diagnosticos",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1207",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Assignado",
    "storyPoint": "3",
    "periodId": "082026",
    "owner": "Antonio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656920669",
    "atividade": "doc24 | BE | Nueva API - GET v2/Alergias",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1787",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Assignado",
    "storyPoint": "2",
    "periodId": "082026"
  },
  {
    "id": "plan-1784656921561",
    "atividade": "doc24 | FE | Exibir ubicacion y emergencia en la consulta virtual",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2113",
    "priority": "P1",
    "componente": "Front-End",
    "estado": "Assignado",
    "storyPoint": "2",
    "periodId": "082026"
  },
  {
    "id": "plan-1784656922934",
    "atividade": "doc24 | BE | v2/phr/historial-paciente-externo borrar crear nuevo objecto \"datos_salud_cronica\"",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2085",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Assignado",
    "storyPoint": "3",
    "periodId": "082026"
  },
  {
    "id": "plan-1784656924331",
    "atividade": "doc24 | Fecha de nacimiento en pdf usr/get-pdf-vc/",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2051",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Ag. Priorização",
    "storyPoint": "2",
    "periodId": "082026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656925028",
    "atividade": "MEMED - BE - Nombre solcial del paciente",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1171",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Ag. Priorização",
    "storyPoint": "2",
    "periodId": "082026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656925564",
    "atividade": "MEMED - FE - Nombre solcial del paciente",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1160",
    "priority": "P1",
    "componente": "Front-End",
    "estado": "Ag. Priorização",
    "storyPoint": "2",
    "periodId": "082026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784900553711",
    "atividade": "APS - Pdfs com RQE em profissionais não médicos",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2162",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Em Desenvolvimento",
    "storyPoint": "3",
    "periodId": "082026",
    "owner": "Antonio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784819724507",
    "atividade": "APS - Nomenclaturas médicas para não médicos",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2159",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Ag. Deploy",
    "storyPoint": "3",
    "periodId": "082026",
    "owner": "Antonio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1785167645754",
    "atividade": "MELI - SendHook - ID_Prescripción errado",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2170",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Ag. Desenvolvimento",
    "storyPoint": "3",
    "periodId": "082026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1785326770539",
    "atividade": "doc24 | Bug de traducción en el reporte de produccion",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2088",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Finalizada",
    "storyPoint": "3",
    "periodId": "082026"
  },
  {
    "id": "plan-1786372603712",
    "atividade": "Problema de Cupos / Qualy e Esaude",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2186",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Ag. Desenvolvimento",
    "storyPoint": "3",
    "periodId": "082026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1785508873198",
    "atividade": "Unimed FL 55 | BE | Exije voucher para Plan Normal",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1721",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Ag. Deploy",
    "storyPoint": "3",
    "periodId": "082026",
    "owner": "Antonio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656935412",
    "atividade": "doc24 | FE | Quitar la obligatoriedad del nombre social para los médicos.",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1931",
    "priority": "P2",
    "componente": "Front-End",
    "estado": "Assignado",
    "storyPoint": "3",
    "periodId": "082026",
    "owner": "Antonio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1785509094041",
    "atividade": "UGF | Turno confirmed mismo con Error en ejecutar guiaTiss en med/get-link-consultorio",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2194",
    "priority": "P2",
    "componente": "Back-End",
    "estado": "Assignado",
    "storyPoint": "2",
    "periodId": "082026",
    "owner": "Antonio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784656924180",
    "atividade": "Unimed FL 55 | FE | Gestión de Registro de Profesionales",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1543",
    "priority": "P1",
    "componente": "Front-End",
    "estado": "Assignado",
    "storyPoint": "8",
    "periodId": "082026",
    "owner": "Antonio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1784817795360",
    "atividade": "Nexus24h 391 | BE | Actualización de certificado SSL",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1583",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Finalizada",
    "storyPoint": "1",
    "periodId": "082026",
    "owner": "Antonio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1787237343550",
    "atividade": "Unimed FL 55 | FE | Registro de Profesionales",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-791",
    "priority": "P0",
    "componente": "Front-End",
    "estado": "Ag. Priorização",
    "storyPoint": "1",
    "periodId": "082026",
    "owner": "Matheus Americo Souza Silva"
  },
  {
    "id": "plan-1787237394452",
    "atividade": "Unimed FL 55 | BE | Gestión de Registro de Profesionales / Creación de Métodos",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-687",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Ag. Priorização",
    "storyPoint": "3",
    "periodId": "082026",
    "owner": "Matheus Americo Souza Silva"
  },
  {
    "id": "plan-1786634204579",
    "atividade": "FE | AlôDr 569 | Nuevo Lenguaje de loco",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-723",
    "priority": "P0",
    "componente": "Front-End",
    "estado": "Ag. Priorização",
    "storyPoint": "1",
    "periodId": "082026",
    "owner": "Matheus Americo Souza Silva"
  },
  {
    "id": "plan-1786727890318",
    "atividade": "doc24 | BE | Contactos de emergencia en external-login",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2244",
    "priority": "P2",
    "componente": "Back-End",
    "estado": "Ag. Priorização",
    "storyPoint": "1",
    "periodId": "082026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "plan-1786727929339",
    "atividade": "doc24 | FE | Contactos de emergencia en external-login",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2245",
    "priority": "P2",
    "componente": "Front-End",
    "estado": "Ag. Priorização",
    "storyPoint": "2",
    "periodId": "082026",
    "owner": "Antônio Gonçalves Almeida Batista"
  }
];

export const defaultRefinement: any = [
  {
    "id": "ref-1784656894353",
    "atividade": "UNIMED Florianópolis - BE - Flujo personal en v2/sesion",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1916",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Impedido",
    "storyPoint": "",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656895387",
    "atividade": "UNIMED Florianópolis - FE - Flujo personal en v2/sesion",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1919",
    "priority": "P0",
    "componente": "Front-End",
    "estado": "Impedido",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656896244",
    "atividade": "55 UNIMED Florianópolis - Cambiar informaciones de \"descricao\" en JMJ",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1922",
    "priority": "P0",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "1",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656897211",
    "atividade": "Doc24 | Corrección de la Visualización de la Credencial (Carteirinha) para Afiliados",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1611",
    "priority": "P0",
    "componente": "Front-End",
    "estado": " Refinado",
    "storyPoint": "1",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656898835",
    "atividade": "NINA | v2/schedule/report-anonymous-new no lista turnos NOSHOW",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1907",
    "priority": "P0",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656899472",
    "atividade": "MEVO - Tipo de matricula profesional en las prescriciones",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1980",
    "priority": "P0",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656900139",
    "atividade": "BE | Integrar receta MEMED/MEVO con Medipreco",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1781",
    "priority": "P0",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "3",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656901824",
    "atividade": "Unimed FL 55 | Doctor-U | Implementación del Nuevo Flujo para clientes Intercambio",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-792",
    "priority": "P1",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "3",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656902511",
    "atividade": "Unimed FL 55 | Doctor-U | Otimização do Fluxo de Agendamento - Cabine Doctor-U",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1549",
    "priority": "P1",
    "componente": "Android",
    "estado": " Refinado",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656903209",
    "atividade": "Unimed 55 | BE | Corrección de Desactivación en el Flujo de Guardia",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1551",
    "priority": "P1",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656904890",
    "atividade": "doc24 | FE | Cambiar la mensaje de respuesta en usr/get-persona",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2000",
    "priority": "P1",
    "componente": "Front-End",
    "estado": " Refinado",
    "storyPoint": "1",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656905543",
    "atividade": "UGF | BE - Se permite informar voucher no válido",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1907",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Impedido",
    "storyPoint": "",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656906231",
    "atividade": "Unimed FL 55 | FE | Gestión de Registro de Profesionales",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1543",
    "priority": "P1",
    "componente": "Front-End",
    "estado": "Impedido",
    "storyPoint": "",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656907876",
    "atividade": "doc24 | BE | Cambiar la mensaje de respuesta en usr/get-persona",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1993",
    "priority": "P1",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "1",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656908502",
    "atividade": "Unimed FL 55 | BE | Gestión de Registro de Profesionales",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-793",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Impedido",
    "storyPoint": "",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656909198",
    "atividade": "FE | Módulo de Prontuario | Corrección del Comportamiento de Patologías y Parámetros Básicos",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1631",
    "priority": "P1",
    "componente": "Front-End",
    "estado": "Impedido",
    "storyPoint": "",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656910811",
    "atividade": "Florianópolis 55 | Doctor-U | Envio TyC de InterAll en la cabina",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1893",
    "priority": "P1",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656911475",
    "atividade": "UA | BE | Notificación de Webhook para Bloqueio de Turno",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1955",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Impedido",
    "storyPoint": "",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656912160",
    "atividade": "doc24 | v2/phr/historial-paciente-externo borrar la obligatoriedad del param IdFinanciador y Plan",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1990",
    "priority": "P1",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656913833",
    "atividade": "Front-End - Filtro de empresa no funciona en Reporte producción",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1932",
    "priority": "P2",
    "componente": "Front-End",
    "estado": " Refinado",
    "storyPoint": "1",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656914512",
    "atividade": "Calerie | Backend persistiendo los datos de pacientes con caracteres minúsculos",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1466",
    "priority": "P2",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "1",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656915199",
    "atividade": "DOC24  | Ajuste en PDFs de Reposo",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-722",
    "priority": "P2",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "3",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656916854",
    "atividade": "Mevo - BE - Nombre solcial del paciente",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1938",
    "priority": "P2",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "1",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656917540",
    "atividade": "FE | Corrección del campo Patología en el PHR e Hipótesis Diagnóstica",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1621",
    "priority": "P1",
    "componente": "Front-End",
    "estado": "Impedido",
    "storyPoint": "",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656918237",
    "atividade": "FE | Leão Vida 587 | Nuevo Lenguaje de loco",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1582?search_id=ff796a73-c551-4b19-b35e-6a20e62522c3&referrer=quick-find",
    "priority": "P0",
    "componente": "Front-End",
    "estado": " Refinado",
    "storyPoint": "1",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656919891",
    "atividade": "doc24 | FE | Roles -  Descargar reporte de produccion",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2089",
    "priority": "P0",
    "componente": "Front-End",
    "estado": "Impedido",
    "storyPoint": "",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656920538",
    "atividade": "Unimed FL 55 | BE | Creación de Parámetro para Prefijo de CRM",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1546",
    "priority": "P3",
    "componente": "Back-End",
    "estado": "Impedido",
    "storyPoint": "",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656921199",
    "atividade": "doc24 | BE | Bug de traducción en el reporte de autogestión",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2088",
    "priority": "P1",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "3",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656922880",
    "atividade": "doc24 | snapshot_paciente no disponible en Admin/auditoria y Admin/auditoria-miniapp",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2089",
    "priority": "P0",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656923522",
    "atividade": "BE | QualyProMed 308 |  Falla en la Validación de Límite de Consultas",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1550",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Impedido",
    "storyPoint": "",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656924180",
    "atividade": "Unimed FL 55 | FE | Gestión de Registro de Profesionales",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1543",
    "priority": "P1",
    "componente": "Front-End",
    "estado": "Refinado",
    "storyPoint": "8",
    "periodId": "072026",
    "owner": ""
  },
  {
    "id": "ref-1784656925841",
    "atividade": "Unimed FL 55 | BE | Gestión de Registro de Profesionales",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-793",
    "priority": "P1",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "8",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656926499",
    "atividade": "Unimed FL 55 | BE | Validación Condicional de Voucher para Guardia / Programada",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-931",
    "priority": "P1",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656927158",
    "atividade": "doc24| BE | Activar Logs de searchAfiliadoUnimed",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2008",
    "priority": "P1",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "1",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656928812",
    "atividade": "doc24 | BE | Nueva API - GET v2/Diagnosticos",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1207",
    "priority": "P2",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "3",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656929465",
    "atividade": "doc24 | BE | Nueva API - GET v2/Alergias",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1787",
    "priority": "P2",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656930122",
    "atividade": "doc24 | Fecha de nacimiento en pdf usr/get-pdf-vc/",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2051",
    "priority": "P3",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656931780",
    "atividade": "doc24 | BE | v2/phr/historial-paciente-externo borrar crear nuevo objecto \"datos_salud_cronica\"",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2085",
    "priority": "P2",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "3",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656932439",
    "atividade": "Búsqueda Unificada de Paciente en Atención Offline",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1617",
    "priority": "P1",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656933100",
    "atividade": "MEMED - FE - Nombre solcial del paciente",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1160",
    "priority": "P2",
    "componente": "Front-End",
    "estado": " Refinado",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656934759",
    "atividade": "MEMED - BE - Nombre solcial del paciente",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1171",
    "priority": "P2",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656935412",
    "atividade": "doc24 | FE | Quitar la obligatoriedad del nombre social para los médicos.",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1931",
    "priority": "P2",
    "componente": "Front-End",
    "estado": "Refinado",
    "storyPoint": "3",
    "periodId": "072026",
    "owner": "Antonio Gonçalves Almeida Batista"
  },
  {
    "id": "ref-1784656936070",
    "atividade": "doc24 | BE | Crear nuevo param \"nombre_social\" en \"admin/update-perfil-medico-minimal\"",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1871",
    "priority": "P2",
    "componente": "Back-End",
    "estado": "Ag. refinamento",
    "storyPoint": "",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656937728",
    "atividade": "55 - UGF | Back-End | InterAll no puede impedir el paciente de ingressar en la sala de espera.",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1106",
    "priority": "P3",
    "componente": "Back-End",
    "estado": "Ag. refinamento",
    "storyPoint": "",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656938385",
    "atividade": "55 | UGF | BE - WhatsApp - Notificar profesional por turno agendado",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1523",
    "priority": "P3",
    "componente": "Back-End",
    "estado": "Ag. refinamento",
    "storyPoint": "",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656939044",
    "atividade": "Back-End | Implementar fechas de accesso en v2/invitacion",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1855",
    "priority": "P3",
    "componente": "Back-End",
    "estado": "Ag. refinamento",
    "storyPoint": "",
    "periodId": "072026"
  },
  {
    "id": "ref-1784656940702",
    "atividade": "Front-End | Implementar fechas de accesso en v2/invitacion",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1869",
    "priority": "P3",
    "componente": "Front-End",
    "estado": "Ag. refinamento",
    "storyPoint": "",
    "periodId": "072026"
  },
  {
    "id": "ref-1784817795360",
    "atividade": "Nexus24h 391 | BE | Actualización de certificado SSL",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1583",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Refinado",
    "storyPoint": "1",
    "periodId": "072026",
    "owner": "Antonio Gonçalves Almeida Batista"
  },
  {
    "id": "ref-1784818086315",
    "atividade": "BE | Ajuste del Estado Inicial en la Creación del Chat",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1169?issueKey=DOC24-1169&subProduct=jira-software",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Impedido",
    "storyPoint": "0",
    "periodId": "072026",
    "owner": ""
  },
  {
    "id": "ref-1784819724507",
    "atividade": "APS - Nomenclaturas médicas para não médicos",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2159",
    "priority": "P0",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "3",
    "periodId": "072026"
  },
  {
    "id": "ref-1784900553711",
    "atividade": "APS - Pdfs com RQE em profissionais não médicos",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2162",
    "priority": "P0",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "3",
    "periodId": "072026"
  },
  {
    "id": "ref-1785167645754",
    "atividade": "MELI - SendHook - ID_Prescripción errado",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2170",
    "priority": "P0",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "3",
    "periodId": "072026"
  },
  {
    "id": "ref-1785326817767",
    "atividade": "doc24 | Bug de traducción en el reporte de produccion",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2088",
    "priority": "P1",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "3",
    "periodId": "072026"
  },
  {
    "id": "ref-1785360070510",
    "atividade": "MEMED - Refresh de template do profissional",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2185",
    "priority": "P0",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "3",
    "periodId": "072026"
  },
  {
    "id": "ref-1785361654489",
    "atividade": "Programa da Cupos / Qualy e Esaude",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2186",
    "priority": "P1",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "3",
    "periodId": "072026"
  },
  {
    "id": "ref-1785426010814",
    "atividade": "APS - Prompt de atenção offline - Persona creada",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2190",
    "priority": "P1",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "ref-1785426095811",
    "atividade": "MELI - Atestados x Recetas",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2188",
    "priority": "P0",
    "componente": "Back-End",
    "estado": " Refinado",
    "storyPoint": "2",
    "periodId": "072026"
  },
  {
    "id": "ref-1785508873198",
    "atividade": "Unimed FL 55 | BE | Exije voucher para Plan Normal",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1721",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Refinado",
    "storyPoint": "3",
    "periodId": "072026",
    "owner": "Antonio Gonçalves Almeida Batista"
  },
  {
    "id": "ref-1785509094041",
    "atividade": "UGF | Turno confirmed mismo con Error en ejecutar guiaTiss en med/get-link-consultorio",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2194",
    "priority": "P2",
    "componente": "Back-End",
    "estado": "Refinado",
    "storyPoint": "2",
    "periodId": "072026",
    "owner": ""
  },
  {
    "id": "ref-1784656924180",
    "atividade": "Unimed FL 55 | FE | Gestión de Registro de Profesionales",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1543",
    "priority": "P1",
    "componente": "Front-End",
    "estado": "Refinado",
    "storyPoint": "8",
    "periodId": "082026",
    "owner": ""
  },
  {
    "id": "ref-1784656935412",
    "atividade": "doc24 | FE | Quitar la obligatoriedad del nombre social para los médicos.",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1931",
    "priority": "P2",
    "componente": "Front-End",
    "estado": "Refinado",
    "storyPoint": "3",
    "periodId": "082026",
    "owner": "Antonio Gonçalves Almeida Batista"
  },
  {
    "id": "ref-1784656936070",
    "atividade": "doc24 | BE | Crear nuevo param \"nombre_social\" en \"admin/update-perfil-medico-minimal\"",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1871",
    "priority": "P2",
    "componente": "Back-End",
    "estado": "Ag. refinamento",
    "storyPoint": "",
    "periodId": "082026"
  },
  {
    "id": "ref-1784656937728",
    "atividade": "55 - UGF | Back-End | InterAll no puede impedir el paciente de ingressar en la sala de espera.",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1106",
    "priority": "P3",
    "componente": "Back-End",
    "estado": "Ag. refinamento",
    "storyPoint": "",
    "periodId": "082026"
  },
  {
    "id": "ref-1784656938385",
    "atividade": "55 | UGF | BE - WhatsApp - Notificar profesional por turno agendado",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1523",
    "priority": "P3",
    "componente": "Back-End",
    "estado": "Ag. refinamento",
    "storyPoint": "",
    "periodId": "082026"
  },
  {
    "id": "ref-1784656939044",
    "atividade": "Back-End | Implementar fechas de accesso en v2/invitacion",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1855",
    "priority": "P3",
    "componente": "Back-End",
    "estado": "Ag. refinamento",
    "storyPoint": "",
    "periodId": "082026"
  },
  {
    "id": "ref-1784656940702",
    "atividade": "Front-End | Implementar fechas de accesso en v2/invitacion",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1869",
    "priority": "P3",
    "componente": "Front-End",
    "estado": "Ag. refinamento",
    "storyPoint": "",
    "periodId": "082026"
  },
  {
    "id": "ref-1784817795360",
    "atividade": "Nexus24h 391 | BE | Actualización de certificado SSL",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1583",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Refinado",
    "storyPoint": "1",
    "periodId": "082026",
    "owner": "Antonio Gonçalves Almeida Batista"
  },
  {
    "id": "ref-1784818086315",
    "atividade": "BE | Ajuste del Estado Inicial en la Creación del Chat",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1169?issueKey=DOC24-1169&subProduct=jira-software",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Impedido",
    "storyPoint": "0",
    "periodId": "082026",
    "owner": ""
  },
  {
    "id": "ref-1785508873198",
    "atividade": "Unimed FL 55 | BE | Exije voucher para Plan Normal",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1721",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Refinado",
    "storyPoint": "3",
    "periodId": "082026",
    "owner": "Antonio Gonçalves Almeida Batista"
  },
  {
    "id": "ref-1785509094041",
    "atividade": "UGF | Turno confirmed mismo con Error en ejecutar guiaTiss en med/get-link-consultorio",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2194",
    "priority": "P2",
    "componente": "Back-End",
    "estado": "Refinado",
    "storyPoint": "2",
    "periodId": "082026",
    "owner": ""
  },
  {
    "id": "ref-1786372603712",
    "atividade": "Problema de Cupos / Qualy e Esaude",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2186",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Refinado",
    "storyPoint": "3",
    "periodId": "082026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "ref-1786621600079",
    "atividade": "APS - Prompt de atenção offline - Persona creada",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2190",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Ag. refinamento",
    "storyPoint": "0",
    "periodId": "082026",
    "owner": "Antonio Gonçalves Almeida Batista"
  },
  {
    "id": "ref-1786634204579",
    "atividade": "FE | AlôDr 569 | Nuevo Lenguaje de loco",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-723",
    "priority": "P2",
    "componente": "Front-End",
    "estado": "Refinado",
    "storyPoint": "1",
    "periodId": "082026",
    "owner": "Matheus Americo Souza Silva"
  },
  {
    "id": "ref-1786634873531",
    "atividade": "APS - Clasificación y línea de cuidado",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2257",
    "priority": "P1",
    "componente": "Ambos",
    "estado": "Ag. refinamento",
    "storyPoint": "0",
    "periodId": "082026",
    "owner": "Antonio Gonçalves Almeida Batista"
  },
  {
    "id": "ref-1786727890318",
    "atividade": "doc24 | BE | Contactos de emergencia en external-login",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2244",
    "priority": "P2",
    "componente": "Back-End",
    "estado": "Refinado",
    "storyPoint": "1",
    "periodId": "082026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "ref-1786727929339",
    "atividade": "doc24 | FE | Contactos de emergencia en external-login",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2245",
    "priority": "P2",
    "componente": "Front-End",
    "estado": "Refinado",
    "storyPoint": "2",
    "periodId": "082026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "ref-1787237343550",
    "atividade": "Unimed FL 55 | FE | Registro de Profesionales",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-791",
    "priority": "P0",
    "componente": "Front-End",
    "estado": "Refinado",
    "storyPoint": "1",
    "periodId": "082026",
    "owner": "Matheus Americo Souza Silva"
  },
  {
    "id": "ref-1787237394452",
    "atividade": "Unimed FL 55 | BE | Gestión de Registro de Profesionales / Creación de Métodos",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-687",
    "priority": "P0",
    "componente": "Back-End",
    "estado": "Refinado",
    "storyPoint": "3",
    "periodId": "082026",
    "owner": "Matheus Americo Souza Silva"
  },
  {
    "id": "ref-1787316794630",
    "atividade": "UGF - Motivo da negativa",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2260",
    "priority": "P1",
    "componente": "Back-End",
    "estado": "Ag. refinamento",
    "storyPoint": "0",
    "periodId": "082026",
    "owner": "Antônio Gonçalves Almeida Batista"
  },
  {
    "id": "ref-1787742455842",
    "atividade": "PHR Legacy - PNMs - Gestionar Medicaciones y Patalogias ",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-2278",
    "priority": "P2",
    "componente": "Back-End",
    "estado": "Pendente",
    "storyPoint": "0",
    "periodId": "082026"
  },
  {
    "id": "ref-1787755411986",
    "atividade": "FE | IVI 612 | Nuevo Lenguaje de loco",
    "jiraTicket": "https://doc24.atlassian.net/browse/DOC24-1049",
    "priority": "P2",
    "componente": "Front-End",
    "estado": "Ag. refinamento",
    "storyPoint": "0",
    "periodId": "082026",
    "owner": "Matheus Americo Souza Silva"
  }
];

export const defaultParameters: any = {
  "statuses": [
    {
      "id": "Backlog",
      "label": "Backlog",
      "color": "#64748b"
    },
    {
      "id": "Pendente",
      "label": "Pendente",
      "color": "#f59e0b"
    },
    {
      "id": "Em andamento",
      "label": "Em andamento",
      "color": "#3b82f6"
    },
    {
      "id": "Finalizada",
      "label": "Finalizada",
      "color": "#10b981"
    },
    {
      "id": "Impedido",
      "label": "Impedido",
      "color": "#ef4444"
    },
    {
      "id": "Bloqueada",
      "label": "Bloqueada",
      "color": "#ef4801"
    },
    {
      "id": "Atrasada",
      "label": "Atrasada",
      "color": "#8e00c2"
    },
    {
      "id": "Ag. Deploy",
      "label": "Ag. Deploy",
      "color": "#02f23a"
    },
    {
      "id": "Ag. Clinte",
      "label": "Ag. Clinte",
      "color": "#5803d8"
    },
    {
      "id": "Ag. Desenvolvimento",
      "label": "Ag. Desenvolvimento",
      "color": "#b4b3b1"
    },
    {
      "id": "Em Desenvolvimento",
      "label": "Em Desenvolvimento",
      "color": "#97720c"
    },
    {
      "id": "Ag. Priorização",
      "label": "Ag. Priorização",
      "color": "#bcbfc2"
    },
    {
      "id": "Constante",
      "label": "Constante",
      "color": "#c5daf7"
    },
    {
      "id": "Ag. refinamento",
      "label": "Ag. refinamento",
      "color": "#c8c9cb"
    },
    {
      "id": "Em QA",
      "label": "Em QA",
      "color": "#0761df"
    },
    {
      "id": "Assignado",
      "label": "Assignado",
      "color": "#0761df"
    },
    {
      "id": "Refinado",
      "label": "Refinado",
      "color": "#0296b1"
    }
  ],
  "priorities": [
    {
      "id": "P0",
      "label": "P0 - Crítica",
      "color": "#dc2626"
    },
    {
      "id": "P1",
      "label": "P1 - Alta",
      "color": "#ea580c"
    },
    {
      "id": "P2",
      "label": "P2 - Média",
      "color": "#16a34a"
    },
    {
      "id": "P3",
      "label": "P3 - Baixa",
      "color": "#097ce1"
    }
  ],
  "classifications": [
    {
      "id": "Funcional",
      "label": "Funcional",
      "color": "#3b82f6"
    },
    {
      "id": "Suporte a integração",
      "label": "Suporte a integração",
      "color": "#8b5cf6"
    },
    {
      "id": "Suporte L2",
      "label": "Suporte L2",
      "color": "#06b6d4"
    }
  ],
  "components": [
    {
      "id": "Front-End",
      "label": "Front-End",
      "color": "#e69100"
    },
    {
      "id": "Back-End",
      "label": "Back-End",
      "color": "#031ddd"
    },
    {
      "id": "Mobile",
      "label": "Mobile",
      "color": "#c8d600"
    },
    {
      "id": "Ambos",
      "label": "Ambos",
      "color": "#038c37"
    }
  ],
  "goals": [
    {
      "meta": "Tickets finalizados",
      "alvo": "70%",
      "referencia": "Finalizada",
      "type": "A"
    },
    {
      "meta": "Pendente ou Ag Cliente",
      "alvo": "15%",
      "referencia": "Ag. Clinte,Pendente",
      "type": "L"
    },
    {
      "meta": "Transbordo",
      "alvo": "15%",
      "referencia": "Em andamento,Em QA,Atrasada,Constante",
      "type": "L"
    }
  ]
};

export const defaultTimerPresets: any = [
  {
    "id": "daily_15",
    "name": "Daily",
    "durationMinutes": 15,
    "category": "Reunião",
    "description": "Timebox para daily (15 min)",
    "soundAlert": true,
    "color": "#3b82f6"
  },
  {
    "id": "timebox_5",
    "name": "Timebox de Pitch/Parking Lot",
    "durationMinutes": 5,
    "category": "Reunião",
    "description": "Limite de 5 min para discussões pontuais ou discussões",
    "soundAlert": true,
    "color": "#f59e0b"
  },
  {
    "id": "pomodoro_25",
    "name": "Foco Pomodoro",
    "durationMinutes": 25,
    "category": "Foco",
    "description": "Bloco de 25 minutos de trabalho imersivo sem interrupções",
    "soundAlert": true,
    "color": "#10b981"
  },
  {
    "id": "break_short_5",
    "name": "Pausa Curta",
    "durationMinutes": 5,
    "category": "Intervalo",
    "description": "Intervalo de 5 minutos para descanso e água",
    "soundAlert": true,
    "color": "#06b6d4"
  },
  {
    "id": "break_long_15",
    "name": "Pausa Longa",
    "durationMinutes": 15,
    "category": "Intervalo",
    "description": "Desconexão de 15 minutos após blocos intensos de sprint",
    "soundAlert": true,
    "color": "#64748b"
  }
];

export const defaultUserTasks: any = [
  {
    "id": "pt-1784650000001",
    "ownerUsername": "admin",
    "title": "InterAll - Confirmar dados obrigatórios",
    "description": "Verificar qual dado é obrigatório e como a interall o utiliza no momento do envio das aferições.\n11/08 - Notificado e questionado no grupo do whatsApp.\n\n11/08 - Antonio compartilhou no grupo do Whatsapp oserros de campos obrigatórios. Foi confirmado pela interall que as informações são obrigatórias e que devem ser enviadas somente se houver consulta",
    "status": "Concluída",
    "priority": "P1",
    "createdAt": "2026-08-07T09:00:00.000Z",
    "updatedAt": "2026-08-12T15:27:44.137Z"
  },
  {
    "id": "pt-1784650000002",
    "ownerUsername": "analista",
    "title": "Acompanhar chamados do Movidesk",
    "description": "Analisar chamados de suporte e alinhar prazos com os desenvolvedores.",
    "status": "Em Andamento",
    "priority": "P0",
    "createdAt": "2026-08-07T09:30:00.000Z"
  },
  {
    "id": "task-1786114810281-7hci",
    "ownerUsername": "admin",
    "title": "InterAll - Confirmar se o envio do aceite esta somente pela cabine esta na nova versão da apk.",
    "description": "",
    "priority": "P1",
    "status": "Em Andamento",
    "createdAt": "2026-08-07T15:00:10.281Z",
    "updatedAt": "2026-08-11T19:50:21.722Z"
  },
  {
    "id": "task-1786114859485-cfb7",
    "ownerUsername": "admin",
    "title": "UGF - Código de verificação",
    "description": "Formalizar ao Tiago o comportamento do código de verificação em autogestão.\nFormalizado e enviado a Márcia",
    "priority": "P1",
    "status": "Concluída",
    "createdAt": "2026-08-07T15:00:59.485Z",
    "updatedAt": "2026-08-07T18:23:20.329Z"
  },
  {
    "id": "task-1786127088720-p8bg",
    "ownerUsername": "admin",
    "title": "MIMO - v2/Schedule/availability-anonimous com mais turnos",
    "description": "Testar offset e limit. Estou confirmando con Vic sobre el rate limit X Whitelist. Encontrei um caso de Dr. Aqui que Quique afirmou não bloquear mais.",
    "priority": "P0",
    "status": "Concluída",
    "createdAt": "2026-08-07T18:24:48.720Z",
    "updatedAt": "2026-08-11T19:13:38.736Z"
  },
  {
    "id": "task-1786127420250-2uij",
    "ownerUsername": "admin",
    "title": "Medipreço - Integrador de elegibilidad",
    "description": "Finalizar o desenho do integrador de elegibilidade com serviços externos.",
    "priority": "P1",
    "status": "Em Andamento",
    "createdAt": "2026-08-07T18:30:20.250Z"
  },
  {
    "id": "task-1786128688615-6wtr",
    "ownerUsername": "admin",
    "title": "UGF - Erro da carteirinha",
    "description": "Asignar o JIRA aberto para \"UGF - Criação de convite por modulo medico e prestado\"",
    "priority": "P2",
    "status": "Concluída",
    "createdAt": "2026-08-07T18:51:28.615Z",
    "updatedAt": "2026-08-10T18:44:34.619Z"
  },
  {
    "id": "task-1786382383984-nnsn",
    "ownerUsername": "admin",
    "title": "Edital Prefeitura Goiânia Licitação",
    "description": "Analisar pedido do Fernando. 11/08 - E-mail devolvido ao Fernando solicitando mais detalhes",
    "priority": "P2",
    "status": "Concluída",
    "createdAt": "2026-08-10T17:19:43.983Z",
    "updatedAt": "2026-08-11T13:00:57.475Z"
  },
  {
    "id": "task-1786477856134-74bi",
    "ownerUsername": "admin",
    "title": "UGF - Estudo do módulo de triagem",
    "description": "Estudar o desenvolvimento da UNIMED Campo Grande",
    "priority": "P2",
    "status": "Pendente",
    "createdAt": "2026-08-11T19:50:56.134Z"
  },
  {
    "id": "task-1786553867683-5ogk",
    "ownerUsername": "admin",
    "title": "APS - Armar tickets da fase 2",
    "description": "Evoluir a tarefas pendentes e aplicar a classificação do paciente na página de meus pacientes. Juanma actualizó que estan armando tajeres para evolucionar el producto de aps, mismo WH x doc24. Ticket paralizado.",
    "priority": "P0",
    "status": "Concluída",
    "createdAt": "2026-08-12T16:57:47.683Z",
    "updatedAt": "2026-08-13T15:54:46.950Z"
  },
  {
    "id": "task-1786553929068-qrvn",
    "ownerUsername": "admin",
    "title": "Planes x Vouchers - Armar ticket de melhoria",
    "description": "Armar tickets de melhoria na validação de vouchers, permitindo que seja possível realizar o controle por planes y no solamente por brand.",
    "priority": "P1",
    "status": "Pendente",
    "createdAt": "2026-08-12T16:58:49.068Z"
  },
  {
    "id": "task-1786977658862-bz1m",
    "ownerUsername": "admin",
    "title": "APS - Revisar documentação para orçamento zenvia",
    "description": "Armar documentação e montar collection",
    "priority": "P1",
    "status": "Em Andamento",
    "createdAt": "2026-08-17T14:40:58.862Z"
  }
];

export const defaultVersionamento: any = {
  "version": "V1.2.3",
  "date": "2026-07-29",
  "description": "Antonio Batista - Incluído novos períodos e botão de métricas globais"
};

export const defaultLockStatus: any = {
  "locked": false,
  "lockedBy": null,
  "lockedAt": null,
  "expiresAt": null
};

export const defaultGithubConfig: any = {
  "token": "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",
  "owner": "batistaproducts",
  "repo": "doc24BoardTeamBR",
  "branch": "main",
  "enabled": true
};

export const defaultGitHubConfig: any = defaultGithubConfig;

