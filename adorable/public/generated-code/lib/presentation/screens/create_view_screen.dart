import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../bloc/insta_bloc_bloc.dart';
import '../../bloc/insta_bloc_event.dart';
import '../../bloc/insta_bloc_state.dart';
import '../components/media_composer.dart';

class CreateViewScreen extends StatelessWidget {
  const CreateViewScreen({Key? key})
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
                    child: MediaComposer(
                      title: 'New post',
                      subtitle: 'Draft and publish from one flow',
                      primaryLabel: 'Select media',
                      selectedLabel: state.selectedMediaLabel,
                      draftCaption: state.draftCaption,
                      captionPlaceholder: 'Write a caption',
                      secondaryLabel: 'Publish draft',
                      statusText: state.publishStatus,
                      isPublishing: state.isPublishing,
                      onPick: (dynamic value) {
                        context.read<InstaBlocBloc>().add(SelectMediaInstaBlocEvent(attachment: value));
                      },
                      onCaptionChanged: (dynamic value) {
                        context.read<InstaBlocBloc>().add(UpdateDraftCaptionInstaBlocEvent(value: value));
                      },
                      onSecondary: () {
                        context.read<InstaBlocBloc>().add(PublishDraftInstaBlocEvent());
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
