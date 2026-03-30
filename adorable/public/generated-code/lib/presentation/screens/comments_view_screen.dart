import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../bloc/insta_bloc_bloc.dart';
import '../../bloc/insta_bloc_event.dart';
import '../../bloc/insta_bloc_state.dart';
import '../components/comment_composer.dart';
import '../components/comment_row.dart';
import '../components/comment_sheet_header.dart';
import '../components/quick_reaction_bar.dart';

class CommentsViewScreen extends StatelessWidget {
  const CommentsViewScreen({Key? key})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<InstaBlocBloc, InstaBlocState>(
      builder: (BuildContext context, InstaBlocState state) {
        return Scaffold(
          body: Stack(
            children: <Widget>[
              InkWell(
                onTap: () {
                  context.read<InstaBlocBloc>().add(CloseOverlayInstaBlocEvent());
                },
                child: Container(decoration: BoxDecoration(color: Colors.black)),
              ),
              Align(
                alignment: Alignment.bottomCenter,
                child: Container(
                  height: MediaQuery.of(context).size.height * (0.82),
                  decoration: BoxDecoration(color: Color(0xFF121212), border: Border.all(color: Color(0xFF27272A), width: 1)),
                  child: Column(
                    children: <Widget>[
                      Center(
                        child: Padding(
                          padding: EdgeInsets.fromLTRB(12, 16, 12, 16),
                          child: CommentSheetHeader(
                            title: 'Comments',
                            onActionTap: () {
                              context.read<InstaBlocBloc>().add(OpenMessagesInstaBlocEvent());
                            },
                          ),
                        ),
                      ),
                      Divider(),
                      Expanded(
                        child: Center(
                          child: Padding(
                            padding: EdgeInsets.fromLTRB(16, 16, 0, 16),
                            child: SingleChildScrollView(
                              child: Column(
                                children: <Widget>[for (final item in state.visibleComments) Container(
                                  padding: EdgeInsets.fromLTRB(0, 0, 20, 0),
                                  child: CommentRow(
                                    avatarText: item.avatarText,
                                    author: item.author,
                                    timeLabel: item.timeLabel,
                                    body: item.body,
                                    likeCount: item.likeCount,
                                    liked: item.liked,
                                    likedByAuthor: item.likedByAuthor,
                                    onLike: () {
                                      context.read<InstaBlocBloc>().add(ToggleCommentLikeInstaBlocEvent(commentId: item.id));
                                    },
                                    onReply: () {
                                      context.read<InstaBlocBloc>().add(StartReplyInstaBlocEvent(username: item.author));
                                    },
                                  ),
                                )],
                              ),
                            ),
                          ),
                        ),
                      ),
                      Container(
                        padding: EdgeInsets.fromLTRB(12, 16, 16, 16),
                        decoration: BoxDecoration(border: Border.all(color: Color(0xFF27272A), width: 1)),
                        child: Column(
                          children: <Widget>[
                            QuickReactionBar(
                              items: state.commentQuickReactions,
                              onItemTap: (dynamic value) {
                                context.read<InstaBlocBloc>().add(QuickReactInstaBlocEvent(emoji: value));
                              },
                            ),
                            CommentComposer(
                              avatarText: state.profileAvatarText,
                              draftText: state.commentDraft,
                              placeholder: 'Add a comment...',
                              replyContext: state.replyingToUsername,
                              sendLabel: 'Post',
                              gifLabel: 'GIF',
                              onChanged: (dynamic value) {
                                context.read<InstaBlocBloc>().add(UpdateCommentDraftInstaBlocEvent(value: value));
                              },
                              onSend: () {
                                context.read<InstaBlocBloc>().add(AddCommentInstaBlocEvent());
                              },
                              onClearReply: () {
                                context.read<InstaBlocBloc>().add(ClearReplyTargetInstaBlocEvent());
                              },
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
