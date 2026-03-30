import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../bloc/insta_bloc_bloc.dart';
import '../../bloc/insta_bloc_event.dart';
import '../../bloc/insta_bloc_state.dart';
import '../components/bottom_tab_shell.dart';
import '../components/conversation_thread_row.dart';
import '../components/inbox_category_tabs.dart';
import '../components/inbox_header.dart';

class InboxViewScreen extends StatelessWidget {
  const InboxViewScreen({Key? key})
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
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      children: <Widget>[
                        Padding(
                          padding: EdgeInsets.fromLTRB(12, 16, 8, 16),
                          child: InboxHeader(
                            title: state.inboxAccountUsername,
                            onLeading: () {
                              context.read<InstaBlocBloc>().add(CloseOverlayInstaBlocEvent());
                            },
                            onAccount: () {
                              context.read<InstaBlocBloc>().add(SetInboxTabInstaBlocEvent(tab: 'primary'));
                            },
                            onMore: () {
                              context.read<InstaBlocBloc>().add(SetInboxTabInstaBlocEvent(tab: 'requests'));
                            },
                            onCompose: () {
                              context.read<InstaBlocBloc>().add(OpenConversationInstaBlocEvent(threadId: 1));
                            },
                          ),
                        ),
                        Padding(
                          padding: EdgeInsets.fromLTRB(0, 16, 12, 16),
                          child: InboxCategoryTabs(
                            activeTab: state.inboxTab,
                            onPrimary: () {
                              context.read<InstaBlocBloc>().add(SetInboxTabInstaBlocEvent(tab: 'primary'));
                            },
                            onGeneral: () {
                              context.read<InstaBlocBloc>().add(SetInboxTabInstaBlocEvent(tab: 'general'));
                            },
                            onRequests: () {
                              context.read<InstaBlocBloc>().add(SetInboxTabInstaBlocEvent(tab: 'requests'));
                            },
                          ),
                        ),
                        Padding(
                          padding: EdgeInsets.fromLTRB(4, 0, 16, 0),
                          child: Column(
                            children: <Widget>[for (final thread in state.visibleInboxThreads) Container(
                              padding: EdgeInsets.fromLTRB(0, 16, 0, 16),
                              child: ConversationThreadRow(
                                avatarText: thread.avatarText,
                                title: thread.displayName,
                                subtitle: thread.preview,
                                timeLabel: thread.timeLabel,
                                hasStory: thread.hasStory,
                                unread: thread.unread,
                                showCameraAction: !thread.unread,
                                onTap: () {
                                  context.read<InstaBlocBloc>().add(OpenConversationInstaBlocEvent(threadId: thread.id));
                                },
                                onAction: () {
                                  context.read<InstaBlocBloc>().add(OpenConversationInstaBlocEvent(threadId: thread.id));
                                },
                              ),
                            )],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                BottomTabShell(
                  activeTab: state.shellTab,
                  onHome: () {
                    context.read<InstaBlocBloc>().add(SetPrimaryTabInstaBlocEvent(tab: 'home'));
                  },
                  onSearch: () {
                    context.read<InstaBlocBloc>().add(SetPrimaryTabInstaBlocEvent(tab: 'search'));
                  },
                  onCreate: () {
                    context.read<InstaBlocBloc>().add(SetPrimaryTabInstaBlocEvent(tab: 'create'));
                  },
                  onReels: () {
                    context.read<InstaBlocBloc>().add(SetPrimaryTabInstaBlocEvent(tab: 'reels'));
                  },
                  onProfile: () {
                    context.read<InstaBlocBloc>().add(SetPrimaryTabInstaBlocEvent(tab: 'profile'));
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
