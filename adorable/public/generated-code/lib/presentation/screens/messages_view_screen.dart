import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../bloc/insta_bloc_bloc.dart';
import '../../bloc/insta_bloc_event.dart';
import '../../bloc/insta_bloc_state.dart';
import '../components/conversation_composer.dart';
import '../components/conversation_header.dart';
import '../components/conversation_hint.dart';
import '../components/message_bubble.dart';
import '../components/message_notice_banner.dart';

class MessagesViewScreen extends StatelessWidget {
  const MessagesViewScreen({Key? key})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<InstaBlocBloc, InstaBlocState>(
      builder: (BuildContext context, InstaBlocState state) {
        return Scaffold(
          body: Container(
            decoration: BoxDecoration(color: Colors.black),
            child: Column(
              children: <Widget>[
                Center(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(12, 12, 8, 12),
                    child: ConversationHeader(
                      avatarText: state.messageAvatarText,
                      title: state.messageDisplayName,
                      subtitle: state.messageUsername,
                      metaLabel: state.messageStatus,
                      onBack: () {
                        context.read<InstaBlocBloc>().add(BackToInboxInstaBlocEvent());
                      },
                      onCall: () {
                        context.read<InstaBlocBloc>().add(ToggleVanishModeInstaBlocEvent());
                      },
                      onVideo: () {
                        context.read<InstaBlocBloc>().add(SetPrimaryTabInstaBlocEvent(tab: 'profile'));
                      },
                      onInfo: () {
                        context.read<InstaBlocBloc>().add(SetPrimaryTabInstaBlocEvent(tab: 'search'));
                      },
                    ),
                  ),
                ),
                Center(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(0, 12, 8, 12),
                    child: MessageNoticeBanner(
                      text: state.messageBanner,
                      onDismiss: () {
                        context.read<InstaBlocBloc>().add(DismissMessageBannerInstaBlocEvent());
                      },
                    ),
                  ),
                ),
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      children: <Widget>[
                        for (final message in state.conversationMessages) Center(
                          child: Padding(
                            padding: EdgeInsets.fromLTRB(8, 12, 4, 12),
                            child: Container(
                              padding: EdgeInsets.fromLTRB(0, 0, 8, 0),
                              child: MessageBubble(
                                body: message.body,
                                isOwn: message.isOwn,
                                attachmentTitle: message.attachmentTitle,
                                attachmentMeta: message.attachmentMeta,
                              ),
                            ),
                          ),
                        ),
                        Align(
                          alignment: Alignment.centerRight,
                          child: Container(
                            padding: EdgeInsets.fromLTRB(0, 16, 8, 16),
                            child: Text(
                              'Seen',
                              style: const TextStyle(color: Color(0xFF8E8E8E), fontSize: 11),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Center(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(0, 12, 12, 12),
                    child: ConversationHint(label: 'Swipe up to turn on disappearing messages'),
                  ),
                ),
                Container(
                  padding: EdgeInsets.fromLTRB(0, 8, 8, 8),
                  child: ConversationComposer(
                    draftText: state.messageDraft,
                    placeholder: 'Message...',
                    showSend: state.messageDraft != "",
                    onChanged: (dynamic value) {
                      context.read<InstaBlocBloc>().add(UpdateMessageDraftInstaBlocEvent(value: value));
                    },
                    onSend: () {
                      context.read<InstaBlocBloc>().add(SendMessageInstaBlocEvent());
                    },
                    onCamera: () {
                      context.read<InstaBlocBloc>().add(ToggleVanishModeInstaBlocEvent());
                    },
                    onMic: () {
                      context.read<InstaBlocBloc>().add(ToggleVanishModeInstaBlocEvent());
                    },
                    onGallery: () {
                      context.read<InstaBlocBloc>().add(SetPrimaryTabInstaBlocEvent(tab: 'create'));
                    },
                    onSticker: () {
                      context.read<InstaBlocBloc>().add(OpenCommentsInstaBlocEvent(postId: 1));
                    },
                    onMore: () {
                      context.read<InstaBlocBloc>().add(SetPrimaryTabInstaBlocEvent(tab: 'search'));
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
