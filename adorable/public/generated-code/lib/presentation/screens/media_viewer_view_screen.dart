import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../bloc/insta_bloc_bloc.dart';
import '../../bloc/insta_bloc_event.dart';
import '../../bloc/insta_bloc_state.dart';
import '../components/media_detail_viewer.dart';

class MediaViewerViewScreen extends StatelessWidget {
  const MediaViewerViewScreen({Key? key})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<InstaBlocBloc, InstaBlocState>(
      builder: (BuildContext context, InstaBlocState state) {
        return Scaffold(
          body: SingleChildScrollView(
            child: Column(
              children: <Widget>[
                Center(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: MediaDetailViewer(
                      title: state.selectedMediaAuthor,
                      subtitle: state.selectedMediaHandle,
                      body: state.selectedMediaCaption,
                      mediaLabel: state.selectedMediaTitle,
                      mediaUrl: state.selectedMediaUrl,
                      liked: state.selectedMediaLiked,
                      saved: state.selectedMediaSaved,
                      onLike: () {
                        context.read<InstaBlocBloc>().add(ToggleLikeInstaBlocEvent(postId: state.selectedMediaId));
                      },
                      onComment: () {
                        context.read<InstaBlocBloc>().add(OpenCommentsInstaBlocEvent(postId: state.selectedMediaId));
                      },
                      onSave: () {
                        context.read<InstaBlocBloc>().add(ToggleSaveInstaBlocEvent(postId: state.selectedMediaId));
                      },
                      onClose: () {
                        context.read<InstaBlocBloc>().add(CloseOverlayInstaBlocEvent());
                      },
                    ),
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
